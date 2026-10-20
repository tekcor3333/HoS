import { MonthData, DailyTodoTask } from '../types';
import {
  loadMonthData,
  saveMonthData,
  getMonthStorageKey,
} from './habitStorage';
import {
  loadDailyTodos,
  saveDailyTodos,
  DAILY_TODOS_STORAGE_KEY,
} from './dailyTodoStorage';

export interface UserCloudData {
  userId: string;
  version: number;
  lastUpdated: string;
  months: Record<string, MonthData>; // key: `${year}_${month}`
  dailyTodos: Record<string, DailyTodoTask[]>; // key: `${year}-${month}-${day}`
  preferences?: {
    theme?: 'dark' | 'light';
  };
}

export interface SyncPayload {
  monthData?: MonthData;
  months?: Record<string, MonthData>;
  dailyTodos?: Record<string, DailyTodoTask[]>;
  preferences?: { theme?: 'dark' | 'light' };
  clientVersion?: number;
  clientTimestamp?: string;
}

/**
 * Scan localStorage to collect all saved month records on this device
 */
export function getAllLocalMonths(): Record<string, MonthData> {
  const result: Record<string, MonthData> = {};
  if (typeof window === 'undefined') return result;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('notion_habit_tracker_v1_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as MonthData;
            if (parsed && parsed.year && parsed.month) {
              const monthKey = `${parsed.year}_${parsed.month}`;
              result[monthKey] = parsed;
            }
          } catch {
            // Ignore corrupted entries
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning local months:', e);
  }

  return result;
}

/**
 * Fetch authenticated user data from cloud server
 */
export async function fetchUserCloudData(
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; data: UserCloudData | null; version: number }> {
  let token = await getToken();
  if (!token) {
    return { success: false, data: null, version: 0 };
  }

  try {
    let res = await fetch('/api/user/data', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // If 401, retry once with fresh token
    if (res.status === 401) {
      token = await getToken();
      if (token) {
        res = await fetch('/api/user/data', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }

    if (!res.ok) {
      console.warn('Failed to fetch cloud user data, status:', res.status);
      return { success: false, data: null, version: 0 };
    }

    const json = await res.json();
    return {
      success: true,
      data: json.data || null,
      version: json.version || 0,
    };
  } catch (err) {
    console.error('Network error fetching cloud data:', err);
    return { success: false, data: null, version: 0 };
  }
}

/**
 * Push user changes to cloud server
 */
export async function pushUserSync(
  getToken: () => Promise<string | null>,
  payload: SyncPayload
): Promise<{ success: boolean; data?: UserCloudData; version?: number; error?: string }> {
  let token = await getToken();
  if (!token) {
    return { success: false, error: 'User is not authenticated' };
  }

  try {
    let res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...payload,
        clientTimestamp: new Date().toISOString(),
      }),
    });

    // Retry once on 401
    if (res.status === 401) {
      token = await getToken();
      if (token) {
        res = await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...payload,
            clientTimestamp: new Date().toISOString(),
          }),
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Sync failed with status ${res.status}: ${errText}` };
    }

    const json = await res.json();
    return {
      success: true,
      data: json.data,
      version: json.version,
    };
  } catch (err) {
    console.error('Network error during cloud sync:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Poll for real-time cloud updates from other devices (laptop, mobile, tablet)
 */
export async function pollUserUpdates(
  getToken: () => Promise<string | null>,
  sinceVersion: number,
  signal?: AbortSignal
): Promise<{ success: boolean; hasUpdate: boolean; version: number; data?: UserCloudData }> {
  const token = await getToken();
  if (!token) {
    return { success: false, hasUpdate: false, version: sinceVersion };
  }

  try {
    const res = await fetch(`/api/user/poll?sinceVersion=${sinceVersion}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!res.ok) {
      return { success: false, hasUpdate: false, version: sinceVersion };
    }

    const json = await res.json();
    return {
      success: true,
      hasUpdate: Boolean(json.hasUpdate),
      version: json.version || sinceVersion,
      data: json.data || undefined,
    };
  } catch (err) {
    if (signal?.aborted) {
      return { success: false, hasUpdate: false, version: sinceVersion };
    }
    return { success: false, hasUpdate: false, version: sinceVersion };
  }
}

/**
 * Migrate existing local data and load user's cloud data on login
 */
export async function migrateAndLoadCloudData(
  userId: string,
  getToken: () => Promise<string | null>,
  currentYear: number,
  currentMonth: number
): Promise<{
  monthData: MonthData;
  dailyTodos: Record<string, DailyTodoTask[]>;
  version: number;
}> {
  const currentMonthKey = `${currentYear}_${currentMonth}`;

  // 1. Fetch user's existing data from the cloud
  const cloudResponse = await fetchUserCloudData(getToken);
  const cloudData = cloudResponse.data;

  // 2. Read local data from this device
  const localMonths = getAllLocalMonths();
  const localDailyTodos = loadDailyTodos();

  const migrationKey = `habitos_migrated_${userId}`;

  // SCENARIO A: User already has data in the cloud (e.g. mobile opening existing account from laptop)
  const hasCloudMonths = cloudData && Object.keys(cloudData.months || {}).length > 0;
  const hasCloudTodos = cloudData && Object.keys(cloudData.dailyTodos || {}).length > 0;

  if (cloudData && (hasCloudMonths || hasCloudTodos || (cloudResponse.version && cloudResponse.version > 0))) {
    // Save cloud data locally for offline capability
    Object.entries(cloudData.months || {}).forEach(([, mData]) => {
      saveMonthData(mData);
    });
    if (cloudData.dailyTodos) {
      saveDailyTodos(cloudData.dailyTodos);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(migrationKey, 'true');
    }

    const activeMonthData =
      cloudData.months?.[currentMonthKey] || loadMonthData(currentYear, currentMonth);

    return {
      monthData: activeMonthData,
      dailyTodos: cloudData.dailyTodos || localDailyTodos,
      version: cloudData.version || 1,
    };
  }

  // SCENARIO B: First time user signs in, cloud has no data yet -> Upload local data to cloud!
  const defaultLocalMonth =
    localMonths[currentMonthKey] || loadMonthData(currentYear, currentMonth);
  localMonths[currentMonthKey] = defaultLocalMonth;

  const pushResult = await pushUserSync(getToken, {
    months: localMonths,
    dailyTodos: localDailyTodos,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(migrationKey, 'true');
  }

  return {
    monthData: defaultLocalMonth,
    dailyTodos: localDailyTodos,
    version: pushResult.version || 1,
  };
}
