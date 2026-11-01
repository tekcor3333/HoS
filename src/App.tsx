import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Habit, MonthData, MonthlyGoals, AppView, TabOriginRect } from './types';
import { MONTH_NAMES, getDaysInMonth } from './utils/dateUtils';
import {
  loadMonthData,
  saveMonthData,
  calculateDailyStats,
  calculateWeeklyStats,
  calculateHabitStats,
  calculateOverallStats,
  STARTER_HABITS,
  generateSampleChecks,
  DEFAULT_GOALS,
} from './utils/habitStorage';
import { TopNavigation } from './components/TopNavigation';
import { MonthlyOverview } from './components/MonthlyOverview';
import { ProgressDashboard } from './components/ProgressDashboard';
import { DailyCheckIn } from './components/DailyCheckIn';
import { MonthlyHabitGrid } from './components/MonthlyHabitGrid';
import { WeeklySummary } from './components/WeeklySummary';
import { HabitAnalysis } from './components/HabitAnalysis';
import { MonthlyHistory } from './components/MonthlyHistory';
import { HabitModal } from './components/HabitModal';
import { CelestialSwitchShowcaseModal } from './components/CelestialSwitchShowcaseModal';
import { JoinLiquidGlassModal } from './components/JoinLiquidGlassModal';
import { LiquidGlassScrollRail } from './components/LiquidGlassScrollRail';
import { MobileBottomDock } from './components/MobileBottomDock';
import { DailyTaskProgressSection } from './components/DailyTaskProgressSection';
import { Check, ArrowUpRight } from 'lucide-react';
import fixedMountainBackdrop from './assets/sky-mountains-black-clouds-wallpaper-preview.jpg';
import { useAuth, AuthenticateWithRedirectCallback } from './utils/authContext';
import {
  migrateAndLoadCloudData,
  pushUserSync,
  pollUserUpdates,
} from './utils/cloudSyncService';
import { loadDailyTodos, saveDailyTodos, formatDateKey } from './utils/dailyTodoStorage';
import { DailyTodoTask } from './types';

const VALID_VIEWS: AppView[] = [
  'overview',
  'check-in',
  'tasks',
  'grid',
  'weekly',
  'analysis',
  'history',
];

function getViewFromUrl(): AppView {
  if (typeof window === 'undefined') return 'overview';

  // Check pathname: /check-in, /tasks, /grid, /weekly, /analysis, /goals, /history
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (VALID_VIEWS.includes(path as AppView)) {
    return path as AppView;
  }

  // Check hash fallback: #check-in, #daily-checkin, #tasks, #task-bar, #grid, #monthly-grid, etc.
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'daily-checkin') return 'check-in';
  if (hash === 'tasks' || hash === 'task-bar' || hash === 'daily-tasks') return 'tasks';
  if (hash === 'monthly-grid') return 'grid';
  if (hash === 'weekly-summary') return 'weekly';
  if (hash === 'habit-analysis') return 'analysis';
  if (VALID_VIEWS.includes(hash as AppView)) {
    return hash as AppView;
  }

  return 'overview';
}

// SSO Redirect Callback Component that guarantees redirection back to HabitOS home
const SSOCallbackHandler: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // When Clerk user is authenticated, immediately navigate to home '/'
    if (!isLoading && isAuthenticated) {
      if (typeof window !== 'undefined') {
        if (window.opener && window.opener !== window) {
          try {
            window.opener.location.href = '/';
            window.close();
            return;
          } catch {
            // ignore cross-origin error
          }
        }
        window.location.replace('/');
      }
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Safety fallback: Ensure navigation to home page after callback processing
    const safetyTimer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/sso-callback')) {
        if (window.opener && window.opener !== window) {
          try {
            window.opener.location.href = '/';
            window.close();
            return;
          } catch {
            // ignore cross-origin error
          }
        }
        window.location.replace('/');
      }
    }, 2500);

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] text-white">
      <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-center space-y-4 shadow-2xl">
        <div className="w-9 h-9 mx-auto border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-xs font-semibold text-white/80">Signing you in and loading HabitOS...</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        continueSignUpUrl="/"
        afterSignInUrl="/"
        afterSignUpUrl="/"
      />
    </div>
  );
};

export default function App() {
  const { user, isAuthenticated, isLoading, getToken } = useAuth();

  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(11);

  const [monthData, setMonthData] = useState<MonthData>(() => loadMonthData(2026, 11));
  const [dailyTodos, setDailyTodos] = useState<Record<string, DailyTodoTask[]>>(() =>
    loadDailyTodos()
  );
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const cloudVersionRef = useRef<number>(0);
  const pushSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCelestialShowcaseOpen, setIsCelestialShowcaseOpen] = useState<boolean>(false);
  const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('habitos_theme') === 'dark';
  });

  // Internal App-Style View State & macOS Shared-Element App-Opening Spatial Transitions
  const [activeView, setActiveView] = useState<AppView>(() => getViewFromUrl());
  const [displayedView, setDisplayedView] = useState<AppView>(() => getViewFromUrl());
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [visitedViews, setVisitedViews] = useState<Record<AppView, boolean>>({
    overview: true,
    grid: true,
    'check-in': false,
    tasks: false,
    weekly: false,
    analysis: false,
    history: false,
  });
  const scrollPositions = useRef<Record<string, number>>({});
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeViewRef = useRef<AppView>(activeView);
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const activeAnimationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  const performTransitionTo = useCallback(
    (targetView: AppView, originRectParam?: DOMRect | TabOriginRect) => {
      // 1. Cancel any active running animations
      activeAnimationsRef.current.forEach((anim) => {
        try {
          anim.cancel();
        } catch {
          // ignore
        }
      });
      activeAnimationsRef.current = [];

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }

      // 2. Preserve scroll position of outgoing view
      if (typeof window !== 'undefined') {
        scrollPositions.current[displayedView] = window.scrollY || window.pageYOffset || 0;
      }

      // 3. Highlight destination tab beacon smoothly
      const targetNavElement = typeof document !== 'undefined'
        ? (document.querySelector(`[data-nav-tab="${targetView}"]`) as HTMLElement | null)
        : null;

      if (targetNavElement) {
        targetNavElement.classList.remove('mac-tab-origin-pulse');
        requestAnimationFrame(() => {
          targetNavElement.classList.add('mac-tab-origin-pulse');
          setTimeout(() => {
            targetNavElement.classList.remove('mac-tab-origin-pulse');
          }, 350);
        });
      }

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 4. Mark view as visited and switch views instantly (0ms DOM reconstruction)
      setVisitedViews((prev) => (prev[targetView] ? prev : { ...prev, [targetView]: true }));
      setActiveView(targetView);
      setDisplayedView(targetView);

      // Restore scroll position or start at top (0)
      if (typeof window !== 'undefined') {
        const savedScroll = scrollPositions.current[targetView] ?? 0;
        window.scrollTo({
          top: savedScroll,
          behavior: 'instant' as ScrollBehavior,
        });
      }

      if (prefersReducedMotion) {
        setTransitionPhase('idle');
        return;
      }

      setTransitionPhase('entering');

      // 5. Hardware-accelerated GPU compositor transition (buttery smooth 60 FPS fluid glide, 440ms)
      requestAnimationFrame(() => {
        const targetContainer = viewContainerRef.current;
        if (!targetContainer || typeof targetContainer.animate !== 'function') {
          setTransitionPhase('idle');
          return;
        }

        const enterAnim = targetContainer.animate(
          [
            {
              opacity: 0,
              transform: 'translate3d(0, 20px, 0)',
            },
            {
              opacity: 1,
              transform: 'translate3d(0, 0, 0)',
            },
          ],
          {
            duration: 440,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          }
        );

        activeAnimationsRef.current.push(enterAnim);

        enterAnim.onfinish = () => {
          try {
            targetContainer.style.transform = 'none';
            targetContainer.style.opacity = '1';
            enterAnim.cancel();
          } catch {
            // ignore
          }
          setTransitionPhase('idle');
        };
      });
    },
    [displayedView]
  );

  const handleNavigate = useCallback(
    (view: AppView, originRect?: DOMRect | TabOriginRect) => {
      if (view === activeView && transitionPhase === 'idle') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Clean SPA routing without full page reload
      const targetPath = view === 'overview' ? '/' : `/${view}`;
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }

      performTransitionTo(view, originRect);
    },
    [activeView, transitionPhase, performTransitionTo]
  );

  // Synchronize on browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlView = getViewFromUrl();
      if (urlView !== activeViewRef.current) {
        // Find destination tab rect in DOM for spatial continuity
        const destTab = document.querySelector(`[data-nav-tab="${urlView}"]`) as HTMLElement | null;
        const rect = destTab ? destTab.getBoundingClientRect() : undefined;
        performTransitionTo(urlView, rect);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [performTransitionTo]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('habitos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('habitos_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // 1. Initial Cloud Data Load & Device Migration on user authentication
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      cloudVersionRef.current = 0;
      return;
    }

    let isCancelled = false;
    setCloudSyncStatus('syncing');

    migrateAndLoadCloudData(user.id, getToken, year, month)
      .then((result) => {
        if (isCancelled) return;
        setMonthData(result.monthData);
        setDailyTodos(result.dailyTodos);
        cloudVersionRef.current = result.version;
        setCloudSyncStatus('synced');
      })
      .catch((err) => {
        console.error('Failed to load user cloud data:', err);
        if (!isCancelled) setCloudSyncStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // 2. Real-time background sync listener across devices (Laptop, Phone, Tablet)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let isCancelled = false;
    const abortController = new AbortController();

    const checkUpdates = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const pollRes = await pollUserUpdates(
          getToken,
          cloudVersionRef.current,
          abortController.signal
        );

        if (isCancelled) return;

        if (pollRes.success && pollRes.hasUpdate && pollRes.data) {
          const currentMonthKey = `${year}_${month}`;
          const cloudMonth = pollRes.data.months?.[currentMonthKey];
          if (cloudMonth) {
            setMonthData(cloudMonth);
            saveMonthData(cloudMonth);
          }
          if (pollRes.data.dailyTodos) {
            setDailyTodos(pollRes.data.dailyTodos);
            saveDailyTodos(pollRes.data.dailyTodos);
          }
          cloudVersionRef.current = pollRes.version;
          setCloudSyncStatus('synced');
        }
      } catch {
        // Suppress background abort/network hiccups
      }
    };

    // When phone is unlocked or laptop tab is focused, check immediately
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkUpdates();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Continuous heartbeat check every 6 seconds for multi-device live sync
    const interval = setInterval(checkUpdates, 6000);

    return () => {
      isCancelled = true;
      abortController.abort();
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.id, year, month, getToken]);

  // Handle month/year switching
  useEffect(() => {
    const data = loadMonthData(year, month);
    setMonthData(data);
  }, [year, month]);

  // Debounced cloud push queue
  const queueCloudSync = useCallback(
    (payload: { monthData?: MonthData; dailyTodos?: Record<string, DailyTodoTask[]> }) => {
      if (!isAuthenticated) return;

      if (pushSyncTimeoutRef.current) {
        clearTimeout(pushSyncTimeoutRef.current);
      }

      setCloudSyncStatus('syncing');
      pushSyncTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await pushUserSync(getToken, payload);
          if (res.success && res.version) {
            cloudVersionRef.current = res.version;
            setCloudSyncStatus('synced');
          }
        } catch (err) {
          console.warn('Sync to cloud error:', err);
          setCloudSyncStatus('error');
        }
      }, 400);
    },
    [isAuthenticated, getToken]
  );

  const updateData = (newData: MonthData) => {
    setMonthData(newData);
    saveMonthData(newData);
    queueCloudSync({ monthData: newData });
  };

  const handleDailyTodosChange = useCallback(
    (newTodos: Record<string, DailyTodoTask[]>) => {
      setDailyTodos(newTodos);
      saveDailyTodos(newTodos);
      queueCloudSync({ dailyTodos: newTodos });
    },
    [queueCloudSync]
  );

  const todayDate = useMemo(() => new Date(2026, 8, 23), []);
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthName = MONTH_NAMES[month - 1];

  const dailyStats = useMemo(() => {
    return calculateDailyStats(monthData.habits, monthData.checks, year, month, todayDate);
  }, [monthData.habits, monthData.checks, year, month, todayDate]);

  const weeklyStats = useMemo(() => {
    return calculateWeeklyStats(monthData.habits, monthData.checks, daysInMonth);
  }, [monthData.habits, monthData.checks, daysInMonth]);

  const currentDayForStreak = useMemo(() => {
    const isCurrent = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
    return isCurrent ? todayDate.getDate() : daysInMonth;
  }, [year, month, todayDate, daysInMonth]);

  const habitStatsList = useMemo(() => {
    return monthData.habits.map((h) =>
      calculateHabitStats(h, monthData.checks, daysInMonth, currentDayForStreak)
    );
  }, [monthData.habits, monthData.checks, daysInMonth, currentDayForStreak]);

  const overallStats = useMemo(() => {
    return calculateOverallStats(
      monthData.habits,
      monthData.checks,
      monthData.goals,
      year,
      month,
      todayDate
    );
  }, [monthData.habits, monthData.checks, monthData.goals, year, month, todayDate]);

  const handleToggleCheck = (habitId: string, day: number) => {
    const key = `${habitId}_${day}`;
    const newChecks = { ...monthData.checks };
    if (newChecks[key]) {
      delete newChecks[key];
    } else {
      newChecks[key] = true;
    }

    updateData({
      ...monthData,
      checks: newChecks,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleBatchToggle = (day: number, state: boolean) => {
    const newChecks = { ...monthData.checks };
    monthData.habits.forEach((h) => {
      const key = `${h.id}_${day}`;
      if (state) {
        newChecks[key] = true;
      } else {
        delete newChecks[key];
      }
    });

    updateData({
      ...monthData,
      checks: newChecks,
      lastUpdated: new Date().toISOString(),
    });

    showToast(state ? `Marked all habits done for Day ${day}` : `Cleared Day ${day}`);
  };

  const handleSaveHabit = (habitData: Partial<Habit>) => {
    if (habitToEdit) {
      const updatedHabits = monthData.habits.map((h) =>
        h.id === habitToEdit.id ? { ...h, ...habitData } : h
      );
      updateData({
        ...monthData,
        habits: updatedHabits,
        lastUpdated: new Date().toISOString(),
      });
      showToast(`Updated habit "${habitData.name}"`);
    } else {
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name: habitData.name || 'New Habit',
        emoji: habitData.emoji || '🎯',
        category: habitData.category || 'Productivity',
        targetDays: habitData.targetDays || daysInMonth,
        createdAt: new Date().toISOString(),
      };
      updateData({
        ...monthData,
        habits: [...monthData.habits, newHabit],
        lastUpdated: new Date().toISOString(),
      });
      showToast(`Added habit "${newHabit.name}"`);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    const target = monthData.habits.find((h) => h.id === habitId);
    const updatedHabits = monthData.habits.filter((h) => h.id !== habitId);
    const newChecks = { ...monthData.checks };

    Object.keys(newChecks).forEach((key) => {
      if (key.startsWith(`${habitId}_`)) {
        delete newChecks[key];
      }
    });

    updateData({
      ...monthData,
      habits: updatedHabits,
      checks: newChecks,
      lastUpdated: new Date().toISOString(),
    });

    showToast(`Deleted habit "${target?.name || ''}"`);
  };

  const handleDuplicateMonth = () => {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    const nextDays = getDaysInMonth(nextY, nextM);

    const clonedHabits = monthData.habits.map((h) => ({
      ...h,
      targetDays: nextDays,
    }));

    const clonedData: MonthData = {
      year: nextY,
      month: nextM,
      habits: clonedHabits,
      checks: {},
      goals: { ...monthData.goals },
      lastUpdated: new Date().toISOString(),
    };

    saveMonthData(clonedData);
    setYear(nextY);
    setMonth(nextM);
    queueCloudSync({ monthData: clonedData });
    showToast(`Cloned ${clonedHabits.length} habits to ${MONTH_NAMES[nextM - 1]} ${nextY}!`);
  };

  const handleCloneToSpecificMonth = (targetMonth: number) => {
    const targetDays = getDaysInMonth(year, targetMonth);
    const clonedHabits = monthData.habits.map((h) => ({
      ...h,
      targetDays,
    }));

    const clonedData: MonthData = {
      year,
      month: targetMonth,
      habits: clonedHabits,
      checks: {},
      goals: { ...monthData.goals },
      lastUpdated: new Date().toISOString(),
    };

    saveMonthData(clonedData);
    setMonth(targetMonth);
    queueCloudSync({ monthData: clonedData });
    showToast(`Setup copied to ${MONTH_NAMES[targetMonth - 1]} ${year}!`);
  };

  const handleUpdateGoals = (newGoals: MonthlyGoals) => {
    updateData({
      ...monthData,
      goals: newGoals,
      lastUpdated: new Date().toISOString(),
    });
    showToast('Updated monthly goals');
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(monthData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Habit_Tracker_${monthName}_${year}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${monthName} data as JSON`);
  };

  const currentMonthHabitChecksCount = useMemo(() => {
    return Object.values(monthData.checks || {}).filter(Boolean).length;
  }, [monthData.checks]);

  const currentMonthTaskChecksCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dKey = formatDateKey(year, month, d);
      const list = dailyTodos[dKey];
      if (list) {
        count += list.filter((t) => t.completed).length;
      }
    }
    return count;
  }, [dailyTodos, year, month, daysInMonth]);

  const handleResetMonthChecks = (targetMonth?: number, targetYear?: number) => {
    const m = targetMonth || month;
    const y = targetYear || year;
    const isCurrent = m === month && y === year;

    if (isCurrent) {
      const clearedData: MonthData = {
        ...monthData,
        checks: {},
        lastUpdated: new Date().toISOString(),
      };
      updateData(clearedData);
    } else {
      const targetData = loadMonthData(y, m);
      targetData.checks = {};
      targetData.lastUpdated = new Date().toISOString();
      saveMonthData(targetData);
      queueCloudSync({ monthData: targetData });
    }
    showToast(`Cleared all habit ticks for ${MONTH_NAMES[m - 1]} ${y}`);
  };

  const handleResetMonthTasks = (targetMonth?: number, targetYear?: number) => {
    const m = targetMonth || month;
    const y = targetYear || year;
    const days = getDaysInMonth(y, m);
    const updated = { ...dailyTodos };
    let clearedCount = 0;

    for (let d = 1; d <= days; d++) {
      const dKey = formatDateKey(y, m, d);
      if (updated[dKey] && updated[dKey].length > 0) {
        updated[dKey] = updated[dKey].map((t) => {
          if (t.completed) clearedCount++;
          return { ...t, completed: false };
        });
      }
    }

    setDailyTodos(updated);
    saveDailyTodos(updated);
    queueCloudSync({ dailyTodos: updated });
    showToast(`Cleared ${clearedCount} task ticks for ${MONTH_NAMES[m - 1]} ${y}`);
  };

  const handleResetMonthAll = (targetMonth?: number, targetYear?: number) => {
    const m = targetMonth || month;
    const y = targetYear || year;
    const days = getDaysInMonth(y, m);

    // 1. Clear habit checks
    if (m === month && y === year) {
      updateData({
        ...monthData,
        checks: {},
        lastUpdated: new Date().toISOString(),
      });
    } else {
      const targetData = loadMonthData(y, m);
      targetData.checks = {};
      targetData.lastUpdated = new Date().toISOString();
      saveMonthData(targetData);
      queueCloudSync({ monthData: targetData });
    }

    // 2. Clear daily tasks checks
    const updated = { ...dailyTodos };
    let clearedCount = 0;
    for (let d = 1; d <= days; d++) {
      const dKey = formatDateKey(y, m, d);
      if (updated[dKey] && updated[dKey].length > 0) {
        updated[dKey] = updated[dKey].map((t) => {
          if (t.completed) clearedCount++;
          return { ...t, completed: false };
        });
      }
    }
    setDailyTodos(updated);
    saveDailyTodos(updated);
    queueCloudSync({ dailyTodos: updated });
    showToast(`Cleared all habit & task ticks for ${MONTH_NAMES[m - 1]} ${y}`);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Reset this month back to the default sample dataset with 10 starter habits?'
      )
    ) {
      const habits = STARTER_HABITS.map((h) => ({ ...h, targetDays: daysInMonth }));
      const checks = generateSampleChecks(habits, daysInMonth);
      const resetData: MonthData = {
        year,
        month,
        habits,
        checks,
        goals: { ...DEFAULT_GOALS },
        lastUpdated: new Date().toISOString(),
      };
      updateData(resetData);
      showToast('Reset habit tracker');
    }
  };

  // 1. SSO Redirect Callback Handler for Clerk OAuth
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/sso-callback')) {
    return <SSOCallbackHandler />;
  }

  // 2. Loading state while authentication initializes
  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-[#0f1115]">
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-[11px] font-bold text-white/70 tracking-widest uppercase">
            HabitOS
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative flex flex-col transition-colors duration-500 bg-transparent overflow-x-hidden ${
        isDarkMode ? 'text-white' : 'text-slate-900'
      } selection:bg-slate-900 selection:text-white`}
    >
      {/* 1. COMPLETELY FIXED IMAGE BACKDROP — Attached to viewport, stationary during scrolling */}
      <div
        className="fixed inset-0 pointer-events-none select-none overflow-hidden"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <img
          src={fixedMountainBackdrop}
          alt=""
          className="w-full h-full object-cover object-center transform-gpu"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* 2. ATMOSPHERIC OVERLAY — Soft dark/light mood filter with Littlebird warm champagne-amber zenith aura in Dark Mode */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isDarkMode ? 'littlebird-golden-aura opacity-95' : 'bg-slate-200/35 opacity-100'
          }`}
        />
      </div>

      {/* 3. SCROLLING WEBSITE CONTENT LAYER — Floating Liquid Glass UI moves across the still photo */}
      <div className="relative z-10 flex flex-col flex-1 w-full overflow-x-hidden max-w-full">
        {/* Tourera Signature Floating Pill Top Navigation */}
        <TopNavigation
          activeView={activeView}
          onNavigate={handleNavigate}
          onAddHabit={() => {
            setHabitToEdit(null);
            setIsModalOpen(true);
          }}
          onExport={handleExportData}
          onReset={handleReset}
          currentMonthName={monthName}
          currentYear={year}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenShowcase={() => setIsCelestialShowcaseOpen(true)}
          onOpenJoin={() => setIsJoinOpen(true)}
          cloudSyncStatus={cloudSyncStatus}
        />

        {/* Main Content Viewport */}
        <main className="relative z-10 flex-1 w-full max-w-[1390px] mx-auto px-3 sm:px-6 lg:px-8 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-20 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-12">
          {/* Toast Alert */}
          {toastMessage && (
            <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 border border-white/20">
              <div className="w-5 h-5 rounded-full bg-white text-slate-950 flex items-center justify-center font-black">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Internal App-Style View Container with Smooth View Transitions */}
          <div
            ref={viewContainerRef}
            className="habitos-app-view-container"
          >
            {/* 1. OVERVIEW VIEW */}
            {(displayedView === 'overview' || visitedViews.overview) && (
              <div
                className={`space-y-6 ${displayedView === 'overview' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'overview'}
              >
                <MonthlyOverview
                  year={year}
                  month={month}
                  stats={overallStats}
                  onMonthChange={setMonth}
                  onYearChange={setYear}
                  onDuplicateMonth={handleDuplicateMonth}
                  habitChecksCount={currentMonthHabitChecksCount}
                  completedTasksCount={currentMonthTaskChecksCount}
                  onResetMonthChecks={handleResetMonthChecks}
                  onResetMonthTasks={handleResetMonthTasks}
                  onResetMonthAll={handleResetMonthAll}
                />

                <ProgressDashboard
                  year={year}
                  month={month}
                  stats={overallStats}
                />

                {/* Quick App Launch Cards - 6 Symmetrical Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-1">
                  <button
                    type="button"
                    data-nav-tab="check-in"
                    onClick={(e) => handleNavigate('check-in', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        ✓
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Daily Check-In</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      1-click completion
                    </div>
                  </button>

                  <button
                    type="button"
                    data-nav-tab="tasks"
                    onClick={(e) => handleNavigate('tasks', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        📋
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Task Bar</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      Daily tasks & rings
                    </div>
                  </button>

                  <button
                    type="button"
                    data-nav-tab="grid"
                    onClick={(e) => handleNavigate('grid', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        ⊞
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Habit Grid</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      {monthData.habits.length} habits · {daysInMonth}d
                    </div>
                  </button>

                  <button
                    type="button"
                    data-nav-tab="weekly"
                    onClick={(e) => handleNavigate('weekly', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        📅
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Weekly Summary</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      Week 1 to Week 5
                    </div>
                  </button>

                  <button
                    type="button"
                    data-nav-tab="analysis"
                    onClick={(e) => handleNavigate('analysis', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        📊
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Analysis</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      Consistency stats
                    </div>
                  </button>

                  <button
                    type="button"
                    data-nav-tab="history"
                    onClick={(e) => handleNavigate('history', e.currentTarget.getBoundingClientRect())}
                    className="tourera-glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/60 dark:border-white/10 text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 rounded-2xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        📜
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">History</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5 truncate">
                      Year {year} archives
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 2. CHECK-IN VIEW */}
            {(displayedView === 'check-in' || visitedViews['check-in']) && (
              <div
                className={`space-y-6 ${displayedView === 'check-in' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'check-in'}
              >
                <DailyCheckIn
                  habits={monthData.habits}
                  checks={monthData.checks}
                  year={year}
                  month={month}
                  onToggleCheck={handleToggleCheck}
                  onBatchToggle={handleBatchToggle}
                  todayDate={todayDate}
                />
              </div>
            )}

            {/* 3. TASK BAR & DAILY TASKS VIEW (Opened from upper bar) */}
            {(displayedView === 'tasks' || visitedViews.tasks) && (
              <div
                className={`space-y-6 ${displayedView === 'tasks' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'tasks'}
              >
                <DailyTaskProgressSection
                  habits={monthData.habits}
                  checks={monthData.checks}
                  dailyStats={dailyStats}
                  year={year}
                  month={month}
                  monthName={monthName}
                  onToggleCheck={handleToggleCheck}
                  todayDate={todayDate}
                  standaloneView={true}
                  onAddHabit={() => {
                    setHabitToEdit(null);
                    setIsModalOpen(true);
                  }}
                  dailyTodos={dailyTodos}
                  onDailyTodosChange={handleDailyTodosChange}
                  completedTasksCount={currentMonthTaskChecksCount}
                  habitChecksCount={currentMonthHabitChecksCount}
                  onResetMonthTasks={handleResetMonthTasks}
                  onResetMonthChecks={handleResetMonthChecks}
                  onResetMonthAll={handleResetMonthAll}
                />
              </div>
            )}

            {/* 4. GRID VIEW */}
            {(displayedView === 'grid' || visitedViews.grid) && (
              <div
                className={`space-y-6 ${displayedView === 'grid' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'grid'}
              >
                <MonthlyHabitGrid
                  habits={monthData.habits}
                  checks={monthData.checks}
                  dailyStats={dailyStats}
                  year={year}
                  month={month}
                  monthName={monthName}
                  onToggleCheck={handleToggleCheck}
                  onEditHabit={(h) => {
                    setHabitToEdit(h);
                    setIsModalOpen(true);
                  }}
                  onDeleteHabit={handleDeleteHabit}
                  onAddHabit={() => {
                    setHabitToEdit(null);
                    setIsModalOpen(true);
                  }}
                  todayDate={todayDate}
                  habitChecksCount={currentMonthHabitChecksCount}
                  completedTasksCount={currentMonthTaskChecksCount}
                  onResetMonthChecks={handleResetMonthChecks}
                  onResetMonthTasks={handleResetMonthTasks}
                  onResetMonthAll={handleResetMonthAll}
                />
              </div>
            )}

            {/* 5. WEEKLY VIEW */}
            {(displayedView === 'weekly' || visitedViews.weekly) && (
              <div
                className={`space-y-6 ${displayedView === 'weekly' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'weekly'}
              >
                <WeeklySummary weeklyStats={weeklyStats} />
              </div>
            )}

            {/* 6. ANALYSIS VIEW */}
            {(displayedView === 'analysis' || visitedViews.analysis) && (
              <div
                className={`space-y-6 ${displayedView === 'analysis' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'analysis'}
              >
                <HabitAnalysis habitStats={habitStatsList} />
              </div>
            )}

            {/* 7. HISTORY VIEW */}
            {(displayedView === 'history' || visitedViews.history) && (
              <div
                className={`space-y-6 ${displayedView === 'history' ? 'block' : 'hidden'}`}
                aria-hidden={displayedView !== 'history'}
              >
                <MonthlyHistory
                  currentYear={year}
                  currentMonth={month}
                  onSelectMonth={(m) => {
                    setMonth(m);
                    showToast(`Switched to ${MONTH_NAMES[m - 1]} ${year}`);
                  }}
                  onCloneToMonth={handleCloneToSpecificMonth}
                  onResetMonthTicks={(m) => handleResetMonthChecks(m, year)}
                />
              </div>
            )}
          </div>
        </main>

        {/* Mobile Navigation Dock */}
        <MobileBottomDock
          activeView={displayedView}
          onNavigate={handleNavigate}
        />

        {/* Habit Create/Edit Modal */}
        <HabitModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setHabitToEdit(null);
          }}
          onSave={handleSaveHabit}
          habitToEdit={habitToEdit}
          daysInMonth={daysInMonth}
        />

        {/* Reference Video Celestial Switch Showcase Modal */}
        <CelestialSwitchShowcaseModal
          isOpen={isCelestialShowcaseOpen}
          onClose={() => setIsCelestialShowcaseOpen(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        {/* Liquid Glass Join / Sign In Modal with Mountain and Sky Cloud Wallpapers */}
        <JoinLiquidGlassModal
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onSuccess={(u) =>
            showToast(
              `Welcome, ${typeof u === 'object' && u ? u.name || u.email : u}!`
            )
          }
        />

        {/* Clean Architectural Footer */}
        <footer className="relative z-10 border-t border-slate-300/80 dark:border-white/10 py-6 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md mt-10">
          <div className="max-w-[min(90vw,1390px)] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2 font-medium">
            <div className="flex items-center gap-2">
              <span
                className="font-bold tracking-tight text-slate-950 dark:text-white text-base"
                style={{
                  fontFamily: '"Bodoni Moda", "Playfair Display", "DM Serif Display", "Times New Roman", serif',
                }}
              >
                HoS
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                TeKcOR Ltd.
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Apple-Style Custom Liquid Glass Scroll Rail */}
      <LiquidGlassScrollRail
        activeView={displayedView}
        isTransitioning={transitionPhase !== 'idle'}
      />
    </div>
  );
}
