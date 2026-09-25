import { Habit, MonthData, MonthlyGoals, HabitStats, DailyStat, WeeklyStat, MonthOverviewStats } from '../types';
import { getDaysInMonth, getDayOfWeek, getWeekGroups } from './dateUtils';

export const STARTER_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'Wake up at 05:00',
    emoji: '⏰',
    category: 'Morning Routine',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-2',
    name: 'Exercise / Gym',
    emoji: '🏋️',
    category: 'Health & Fitness',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-3',
    name: 'Reading / Learning',
    emoji: '📖',
    category: 'Mind & Growth',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-4',
    name: 'Project Work',
    emoji: '🎯',
    category: 'Productivity',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-5',
    name: 'Budget Tracking',
    emoji: '💰',
    category: 'Finances',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-6',
    name: 'No Alcohol',
    emoji: '🍷',
    category: 'Health & Fitness',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-7',
    name: 'Social Media Detox',
    emoji: '🌿',
    category: 'Mind & Focus',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-8',
    name: 'Goal Journaling',
    emoji: '📝',
    category: 'Mindfulness',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-9',
    name: 'Cold Shower',
    emoji: '🚿',
    category: 'Discipline',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'habit-10',
    name: 'Sleep on Time',
    emoji: '🌙',
    category: 'Recovery',
    targetDays: 30,
    createdAt: '2026-01-01',
  },
];

export const DEFAULT_GOALS: MonthlyGoals = {
  mainGoal: 'Build unbreakable momentum in daily discipline & physical health',
  habitTarget: 220,
  targetPercentage: 75,
  motivation: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
  notes: 'Focus on consistent sleep schedule and 30 minutes of deep project work every morning before checking emails.',
};

/**
 * Generate realistic reference checks for a given month matching reference photo (65% overall progress)
 */
export function generateSampleChecks(habits: Habit[], daysInMonth: number): Record<string, boolean> {
  const checks: Record<string, boolean> = {};

  // Exact target actual counts matching the reference screenshot:
  // [13, 21, 23, 24, 19, 19, 21, 17, 23, 15] -> total 195/300 = 65%
  const targetActuals = [13, 21, 23, 24, 19, 19, 21, 17, 23, 15];

  habits.forEach((habit, idx) => {
    const targetCount = targetActuals[idx % targetActuals.length] || Math.round(daysInMonth * 0.65);
    // Distribute checks realistically with higher density in weeks 1-3, simulating current month progression
    let currentCount = 0;

    // First ensure week 1 to 3 have realistic streaks
    for (let day = 1; day <= daysInMonth; day++) {
      let shouldCheck = false;

      // Realistic pseudo-random pattern seeded by day and habit index
      const seed = (day * 7 + idx * 13) % 10;
      if (day <= 25) {
        if (currentCount < targetCount && seed >= 2) {
          shouldCheck = true;
          currentCount++;
        }
      } else if (currentCount < targetCount && seed >= 4) {
        shouldCheck = true;
        currentCount++;
      }

      if (shouldCheck) {
        checks[`${habit.id}_${day}`] = true;
      }
    }

    // Top up or trim to hit target count exactly
    for (let day = 1; day <= daysInMonth && currentCount < targetCount; day++) {
      const key = `${habit.id}_${day}`;
      if (!checks[key]) {
        checks[key] = true;
        currentCount++;
      }
    }
  });

  return checks;
}

const STORAGE_PREFIX = 'notion_habit_tracker_v1';

export function getMonthStorageKey(year: number, month: number): string {
  return `${STORAGE_PREFIX}_${year}_${month}`;
}

/**
 * Load month data from localStorage or create default initialized state
 */
export function loadMonthData(year: number, month: number): MonthData {
  const key = getMonthStorageKey(year, month);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.habits) && parsed.habits.length > 0) {
        parsed.habits = parsed.habits.map((h: Habit) =>
          h.category && h.category.toLowerCase().includes('wellness')
            ? { ...h, category: 'Health & Fitness' }
            : h
        );
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading month data from localStorage:', e);
  }

  // Initialize with starter habits & sample checks
  const daysInMonth = getDaysInMonth(year, month);
  const habits = STARTER_HABITS.map((h) => ({ ...h, targetDays: daysInMonth }));
  const checks = generateSampleChecks(habits, daysInMonth);

  const initialData: MonthData = {
    year,
    month,
    habits,
    checks,
    goals: { ...DEFAULT_GOALS },
    lastUpdated: new Date().toISOString(),
  };

  saveMonthData(initialData);
  return initialData;
}

/**
 * Save month data to localStorage
 */
export function saveMonthData(data: MonthData): void {
  try {
    const key = getMonthStorageKey(data.year, data.month);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving month data to localStorage:', e);
  }
}

/**
 * Calculate per-habit formulas:
 * - Completed days
 * - Missed days
 * - Completion rate (%)
 * - Current streak
 * - Longest streak
 */
export function calculateHabitStats(
  habit: Habit,
  checks: Record<string, boolean>,
  daysInMonth: number,
  currentDay: number
): HabitStats {
  let completedDays = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const isDone = Boolean(checks[`${habit.id}_${d}`]);
    if (isDone) {
      completedDays++;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak backwards from currentDay (or latest completed day if today isn't marked yet)
  let checkPointer = currentDay;
  if (!checks[`${habit.id}_${checkPointer}`] && checkPointer > 1 && checks[`${habit.id}_${checkPointer - 1}`]) {
    checkPointer = checkPointer - 1;
  }

  while (checkPointer >= 1 && checks[`${habit.id}_${checkPointer}`]) {
    currentStreak++;
    checkPointer--;
  }

  const missedDays = Math.max(0, currentDay - completedDays);
  const completionRate = daysInMonth > 0 ? Math.round((completedDays / daysInMonth) * 1000) / 10 : 0;

  return {
    habitId: habit.id,
    habit,
    completedDays,
    missedDays,
    completionRate,
    currentStreak,
    longestStreak,
    targetDays: habit.targetDays || daysInMonth,
  };
}

/**
 * Calculate daily column stats for the spreadsheet footer (Progress %, Done, Not Done)
 */
export function calculateDailyStats(
  habits: Habit[],
  checks: Record<string, boolean>,
  year: number,
  month: number,
  todayDate: Date
): DailyStat[] {
  const daysInMonth = getDaysInMonth(year, month);
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const currentDayNum = isCurrentMonth ? todayDate.getDate() : -1;

  const results: DailyStat[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const { shortName, fullName } = getDayOfWeek(year, month, day);
    let done = 0;

    habits.forEach((h) => {
      if (checks[`${h.id}_${day}`]) {
        done++;
      }
    });

    const notDone = habits.length - done;
    const percentage = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0;
    const isToday = day === currentDayNum;
    const isPast = isCurrentMonth ? day < currentDayNum : (todayDate.getFullYear() > year || (todayDate.getFullYear() === year && todayDate.getMonth() + 1 > month));

    results.push({
      day,
      dayName: shortName,
      fullDayName: fullName,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      completedCount: done,
      notDoneCount: notDone,
      totalHabits: habits.length,
      percentage,
      isToday,
      isPast,
    });
  }

  return results;
}

/**
 * Calculate weekly summaries (Week 1 through Week 5)
 */
export function calculateWeeklyStats(
  habits: Habit[],
  checks: Record<string, boolean>,
  daysInMonth: number
): WeeklyStat[] {
  const groups = getWeekGroups(daysInMonth);

  return groups.map((g) => {
    let completedCount = 0;
    const totalPossible = g.days.length * habits.length;

    g.days.forEach((day) => {
      habits.forEach((h) => {
        if (checks[`${h.id}_${day}`]) {
          completedCount++;
        }
      });
    });

    const percentage = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

    let status: WeeklyStat['status'] = 'needs_work';
    if (percentage >= 80) status = 'excellent';
    else if (percentage >= 65) status = 'good';
    else if (percentage >= 40) status = 'average';
    else if (percentage === 0) status = 'upcoming';

    return {
      weekNumber: g.weekNumber,
      weekLabel: g.label,
      days: g.days,
      completedCount,
      totalPossible,
      percentage,
      status,
    };
  });
}

/**
 * Calculate prominent overall month summary stats
 */
export function calculateOverallStats(
  habits: Habit[],
  checks: Record<string, boolean>,
  goals: MonthlyGoals,
  year: number,
  month: number,
  todayDate: Date
): MonthOverviewStats {
  const daysInMonth = getDaysInMonth(year, month);
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const currentDayNum = isCurrentMonth ? todayDate.getDate() : daysInMonth;

  let totalCompletedCheckins = 0;
  const totalPossibleCheckins = habits.length * daysInMonth;

  const habitStatsList = habits.map((h) =>
    calculateHabitStats(h, checks, daysInMonth, currentDayNum)
  );

  habitStatsList.forEach((stat) => {
    totalCompletedCheckins += stat.completedDays;
  });

  const overallPercentage =
    totalPossibleCheckins > 0
      ? Math.round((totalCompletedCheckins / totalPossibleCheckins) * 1000) / 10
      : 0;

  // Best performing habit
  const sortedByRate = [...habitStatsList].sort(
    (a, b) => b.completionRate - a.completionRate || b.completedDays - a.completedDays
  );
  const bestPerformingHabit = sortedByRate.length > 0 ? sortedByRate[0] : null;

  // Overall current streak across all habits
  const overallCurrentStreak =
    habitStatsList.length > 0
      ? Math.round(
          habitStatsList.reduce((acc, curr) => acc + curr.currentStreak, 0) /
            habitStatsList.length
        )
      : 0;

  return {
    totalHabits: habits.length,
    totalDaysInMonth: daysInMonth,
    totalPossibleCheckins,
    totalCompletedCheckins,
    overallPercentage,
    bestPerformingHabit,
    overallCurrentStreak,
    monthlyGoal: goals,
  };
}
