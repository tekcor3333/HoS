import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  category: string;
  targetDays: number;
  color?: string;
  createdAt: string;
}

export interface MonthlyGoals {
  mainGoal: string;
  habitTarget: number;
  targetPercentage: number;
  motivation: string;
  notes: string;
}

export interface MonthData {
  year: number;
  month: number;
  habits: Habit[];
  checks: Record<string, boolean>;
  goals: MonthlyGoals;
  lastUpdated: string;
}

export interface DailyTodoTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

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

const DATA_DIR = path.resolve(process.cwd(), 'data', 'users');
const userUpdateEvents = new EventEmitter();
userUpdateEvents.setMaxListeners(200);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserFilePath(userId: string): string {
  // Sanitize userId to prevent directory traversal
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

// In-memory mutex locks to ensure concurrent writes are atomic
const userLocks = new Map<string, Promise<void>>();

async function acquireUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = userLocks.get(userId) || Promise.resolve();
  let release: () => void = () => {};

  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  userLocks.set(userId, newLock);

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (userLocks.get(userId) === newLock) {
      userLocks.delete(userId);
    }
  }
}

/**
 * Retrieve cloud data for authenticated user
 */
export async function getUserData(userId: string): Promise<UserCloudData | null> {
  const filePath = getUserFilePath(userId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as UserCloudData;
    }
    return null;
  } catch (err) {
    console.error(`Failed to read user data for ${userId}:`, err);
    return null;
  }
}

/**
 * Save user data atomically with version increment
 */
export async function saveUserData(
  userId: string,
  data: UserCloudData
): Promise<UserCloudData> {
  return acquireUserLock(userId, async () => {
    const filePath = getUserFilePath(userId);
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;

    const finalData: UserCloudData = {
      ...data,
      userId,
      version: (data.version || 0) + 1,
      lastUpdated: new Date().toISOString(),
    };

    await fs.promises.writeFile(tmpPath, JSON.stringify(finalData, null, 2), 'utf8');
    await fs.promises.rename(tmpPath, filePath);

    // Notify active long-poll listeners for this user
    userUpdateEvents.emit(`update:${userId}`, finalData);

    return finalData;
  });
}

/**
 * Merge individual MonthData records
 */
function mergeMonthData(existing: MonthData, incoming: MonthData): MonthData {
  const inUpdated = incoming.lastUpdated ? new Date(incoming.lastUpdated).getTime() : 0;
  const exUpdated = existing.lastUpdated ? new Date(existing.lastUpdated).getTime() : 0;

  // If incoming payload is newer or equal, incoming state is authoritative (handles habit deletions and unchecking)
  if (inUpdated >= exUpdated && incoming.habits && incoming.habits.length > 0) {
    return {
      year: incoming.year || existing.year,
      month: incoming.month || existing.month,
      habits: incoming.habits,
      checks: incoming.checks !== undefined ? incoming.checks : (existing.checks || {}),
      goals: incoming.goals ? { ...existing.goals, ...incoming.goals } : existing.goals,
      lastUpdated: incoming.lastUpdated || new Date().toISOString(),
    };
  }

  // Otherwise, merge habits preserving custom additions
  const habitMap = new Map<string, Habit>();
  (existing.habits || []).forEach((h) => habitMap.set(h.id, h));
  (incoming.habits || []).forEach((inH) => {
    const exH = habitMap.get(inH.id);
    if (!exH) {
      habitMap.set(inH.id, inH);
    } else {
      const inTime = inH.createdAt ? new Date(inH.createdAt).getTime() : 0;
      const exTime = exH.createdAt ? new Date(exH.createdAt).getTime() : 0;
      habitMap.set(inH.id, inTime >= exTime ? inH : exH);
    }
  });

  return {
    year: incoming.year || existing.year,
    month: incoming.month || existing.month,
    habits: Array.from(habitMap.values()),
    checks: incoming.checks !== undefined ? incoming.checks : (existing.checks || {}),
    goals: {
      ...existing.goals,
      ...(incoming.goals || {}),
    },
    lastUpdated: inUpdated >= exUpdated ? (incoming.lastUpdated || new Date().toISOString()) : existing.lastUpdated,
  };
}

/**
 * Merge daily todos by date key. When incoming contains a date key, that day's task list
 * is authoritative (allowing task additions, updates, completions, and deletions).
 */
function mergeDailyTodos(
  existing: Record<string, DailyTodoTask[]>,
  incoming: Record<string, DailyTodoTask[]>
): Record<string, DailyTodoTask[]> {
  const result: Record<string, DailyTodoTask[]> = { ...existing };

  Object.entries(incoming).forEach(([dateKey, inTasks]) => {
    // Authoritative replacement for this specific date
    result[dateKey] = inTasks;
  });

  return result;
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
 * Ingest and merge user synchronization payload
 */
export async function syncUserData(
  userId: string,
  payload: SyncPayload
): Promise<UserCloudData> {
  return acquireUserLock(userId, async () => {
    let currentData = await getUserData(userId);

    if (!currentData) {
      // First cloud persistence for this user
      const initialMonths: Record<string, MonthData> = {};
      if (payload.months) {
        Object.assign(initialMonths, payload.months);
      }
      if (payload.monthData) {
        const key = `${payload.monthData.year}_${payload.monthData.month}`;
        initialMonths[key] = payload.monthData;
      }

      currentData = {
        userId,
        version: 1,
        lastUpdated: payload.clientTimestamp || new Date().toISOString(),
        months: initialMonths,
        dailyTodos: payload.dailyTodos || {},
        preferences: payload.preferences || {},
      };

      const filePath = getUserFilePath(userId);
      const tmpPath = `${filePath}.${Date.now()}.tmp`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(currentData, null, 2), 'utf8');
      await fs.promises.rename(tmpPath, filePath);

      userUpdateEvents.emit(`update:${userId}`, currentData);
      return currentData;
    }

    // Merge incoming months
    const mergedMonths: Record<string, MonthData> = { ...currentData.months };
    if (payload.months) {
      Object.entries(payload.months).forEach(([key, mData]) => {
        if (mergedMonths[key]) {
          mergedMonths[key] = mergeMonthData(mergedMonths[key], mData);
        } else {
          mergedMonths[key] = mData;
        }
      });
    }

    if (payload.monthData) {
      const key = `${payload.monthData.year}_${payload.monthData.month}`;
      if (mergedMonths[key]) {
        mergedMonths[key] = mergeMonthData(mergedMonths[key], payload.monthData);
      } else {
        mergedMonths[key] = payload.monthData;
      }
    }

    // Merge incoming daily todos
    let mergedDailyTodos = currentData.dailyTodos || {};
    if (payload.dailyTodos) {
      mergedDailyTodos = mergeDailyTodos(mergedDailyTodos, payload.dailyTodos);
    }

    // Merge preferences
    const mergedPreferences = {
      ...currentData.preferences,
      ...(payload.preferences || {}),
    };

    const newVersion = (currentData.version || 0) + 1;
    const finalData: UserCloudData = {
      userId,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
      months: mergedMonths,
      dailyTodos: mergedDailyTodos,
      preferences: mergedPreferences,
    };

    const filePath = getUserFilePath(userId);
    const tmpPath = `${filePath}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(finalData, null, 2), 'utf8');
    await fs.promises.rename(tmpPath, filePath);

    userUpdateEvents.emit(`update:${userId}`, finalData);
    return finalData;
  });
}

/**
 * Long-polling helper for real-time updates across multiple open devices
 */
export async function waitForUserUpdate(
  userId: string,
  sinceVersion: number,
  timeoutMs: number = 25000
): Promise<{ hasUpdate: boolean; version: number; data?: UserCloudData }> {
  const current = await getUserData(userId);
  if (current && current.version > sinceVersion) {
    return { hasUpdate: true, version: current.version, data: current };
  }

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;

    const onUpdate = (updatedDoc: UserCloudData) => {
      if (timer) clearTimeout(timer);
      userUpdateEvents.removeListener(`update:${userId}`, onUpdate);
      resolve({ hasUpdate: true, version: updatedDoc.version, data: updatedDoc });
    };

    userUpdateEvents.once(`update:${userId}`, onUpdate);

    timer = setTimeout(() => {
      userUpdateEvents.removeListener(`update:${userId}`, onUpdate);
      resolve({ hasUpdate: false, version: sinceVersion });
    }, timeoutMs);
  });
}
