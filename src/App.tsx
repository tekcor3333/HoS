import React, { useState, useEffect, useMemo } from 'react';
import { Habit, MonthData, MonthlyGoals } from './types';
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
import { GoalsSection } from './components/GoalsSection';
import { MonthlyHistory } from './components/MonthlyHistory';
import { HabitModal } from './components/HabitModal';
import { CelestialSwitchShowcaseModal } from './components/CelestialSwitchShowcaseModal';
import { JoinLiquidGlassModal } from './components/JoinLiquidGlassModal';
import { LiquidGlassScrollRail } from './components/LiquidGlassScrollRail';
import { Check } from 'lucide-react';
import fixedMountainBackdrop from './assets/sky-mountains-black-clouds-wallpaper-preview.jpg';
import { useAuth, AuthenticateWithRedirectCallback } from './utils/authContext';

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
  const { user, isAuthenticated, isLoading } = useAuth();

  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(11);

  const [monthData, setMonthData] = useState<MonthData>(() => loadMonthData(2026, 11));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCelestialShowcaseOpen, setIsCelestialShowcaseOpen] = useState<boolean>(false);
  const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('habitos_theme') === 'dark';
  });

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

  useEffect(() => {
    const data = loadMonthData(year, month);
    setMonthData(data);
  }, [year, month]);

  const updateData = (newData: MonthData) => {
    setMonthData(newData);
    saveMonthData(newData);
  };

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
          <span className="text-[11px] font-semibold text-white/70 tracking-widest uppercase font-mono">
            HabitOS
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative flex flex-col transition-colors duration-500 bg-transparent overflow-x-hidden ${
        isDarkMode ? 'text-slate-100' : 'text-slate-900'
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

        {/* 2. ATMOSPHERIC OVERLAY — Soft dark/light mood filter (Pure image, no square lining graph) */}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isDarkMode ? 'bg-slate-950/45' : 'bg-slate-200/35'
          }`}
        />
      </div>

      {/* 3. SCROLLING WEBSITE CONTENT LAYER — Floating Liquid Glass UI moves across the still photo */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Tourera Signature Floating Pill Top Navigation */}
        <TopNavigation
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
        />

        {/* Main Content Viewport */}
        <main className="relative z-10 flex-1 max-w-[min(90vw,1390px)] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8">
          {/* Toast Alert */}
          {toastMessage && (
            <div className="fixed bottom-20 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 border border-white/20">
              <div className="w-5 h-5 rounded-full bg-white text-slate-950 flex items-center justify-center font-black">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* 1. Monthly Overview Header, Slider Pill & Month Switcher */}
          <MonthlyOverview
            year={year}
            month={month}
            stats={overallStats}
            onMonthChange={setMonth}
            onYearChange={setYear}
            onDuplicateMonth={handleDuplicateMonth}
          />

          {/* 2. Progress Dashboard (High-contrast metrics cards) */}
          <ProgressDashboard
            year={year}
            month={month}
            stats={overallStats}
          />

          {/* 3. Daily Check-In (Tourera circular gauge & 1-click completion) */}
          <DailyCheckIn
            habits={monthData.habits}
            checks={monthData.checks}
            year={year}
            month={month}
            onToggleCheck={handleToggleCheck}
            onBatchToggle={handleBatchToggle}
            todayDate={todayDate}
          />

          {/* 4. Monthly Habit Grid (Centerpiece transparent glass sheet & line trend chart) */}
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
          />

          {/* 5. Weekly Summary (Week 1 to Week 5 cards) */}
          <WeeklySummary weeklyStats={weeklyStats} />

          {/* 6. Habit Analysis Database Table */}
          <HabitAnalysis habitStats={habitStatsList} />

          {/* 7. Goals Section */}
          <GoalsSection
            goals={monthData.goals}
            stats={overallStats}
            onUpdateGoals={handleUpdateGoals}
            monthName={monthName}
            year={year}
          />

          {/* 8. Monthly History & Archives */}
          <MonthlyHistory
            currentYear={year}
            currentMonth={month}
            onSelectMonth={setMonth}
            onCloneToMonth={handleCloneToSpecificMonth}
          />
        </main>

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
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                TeKcOR Ltd.
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Apple-Style Custom Liquid Glass Scroll Rail */}
      <LiquidGlassScrollRail />
    </div>
  );
}
