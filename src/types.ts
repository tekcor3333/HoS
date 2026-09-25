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
  habitTarget: number; // e.g. target total check-ins or days per habit
  targetPercentage: number; // e.g. 80%
  motivation: string;
  notes: string;
}

export interface MonthData {
  year: number;
  month: number; // 1 - 12
  habits: Habit[];
  checks: Record<string, boolean>; // key: `${habitId}_${day}` -> true/false
  goals: MonthlyGoals;
  lastUpdated: string;
}

export interface HabitStats {
  habitId: string;
  habit: Habit;
  completedDays: number;
  missedDays: number;
  completionRate: number; // 0 - 100
  currentStreak: number;
  longestStreak: number;
  targetDays: number;
}

export interface DailyStat {
  day: number;
  dayName: string; // e.g. "Sa", "Su", "Mo"
  fullDayName: string; // "Saturday"
  dateString: string;
  completedCount: number;
  notDoneCount: number;
  totalHabits: number;
  percentage: number;
  isToday: boolean;
  isPast: boolean;
}

export interface WeeklyStat {
  weekNumber: number; // 1 to 5
  weekLabel: string;
  days: number[];
  completedCount: number;
  totalPossible: number;
  percentage: number;
  status: 'excellent' | 'good' | 'average' | 'needs_work' | 'upcoming';
}

export interface MonthOverviewStats {
  totalHabits: number;
  totalDaysInMonth: number;
  totalPossibleCheckins: number;
  totalCompletedCheckins: number;
  overallPercentage: number;
  bestPerformingHabit: HabitStats | null;
  overallCurrentStreak: number;
  monthlyGoal: MonthlyGoals;
}

export type ViewTab = 'all' | 'grid' | 'dashboard' | 'analysis' | 'daily' | 'weekly' | 'goals';
