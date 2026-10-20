import React from 'react';
import { MonthOverviewStats } from '../types';
import { MONTH_NAMES } from '../utils/dateUtils';
import { Check, Flame, Target, ListChecks, Calendar } from 'lucide-react';

interface ProgressDashboardProps {
  year: number;
  month: number;
  stats: MonthOverviewStats;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  year,
  month,
  stats,
}) => {
  const monthName = MONTH_NAMES[month - 1];
  const bestHabit = stats.bestPerformingHabit;

  return (
    <section id="progress-dashboard" className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>System Metrics</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 min-[360px]:gap-2.5 sm:gap-3.5">
        {/* Metric 1: Month Period */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Period</span>
            <div className="w-5.5 h-5.5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 dark:bg-[#faf6ee] text-white dark:text-[#0f1013] flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(246,218,126,0.3)] shrink-0">
              <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm min-[360px]:text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {monthName}
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 font-mono tabular-nums mt-0.5 truncate">
              {year} · {stats.totalDaysInMonth}d
            </div>
          </div>
        </div>

        {/* Metric 2: Total Habits */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Habits</span>
            <div className="w-5.5 h-5.5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 dark:bg-[#faf6ee] text-white dark:text-[#0f1013] flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(246,218,126,0.3)] shrink-0">
              <ListChecks className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.totalHabits}
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 mt-0.5 truncate">
              Daily routines
            </div>
          </div>
        </div>

        {/* Metric 3: Completed Check-ins */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Check-ins</span>
            <div className="w-5.5 h-5.5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 dark:bg-[#faf6ee] text-white dark:text-[#0f1013] flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(246,218,126,0.3)] shrink-0">
              <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.totalCompletedCheckins}
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 font-mono tabular-nums mt-0.5 truncate">
              of {stats.totalPossibleCheckins} max
            </div>
          </div>
        </div>

        {/* Metric 4: Completion % */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Completion</span>
            <span className="text-[10px] min-[360px]:text-[11px] sm:text-xs font-mono font-bold text-slate-900 dark:text-white">
              {stats.overallPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.overallPercentage.toFixed(1)}%
            </div>
            <div className="w-full tourera-progress-track rounded-full h-1.5 sm:h-2 mt-2 overflow-hidden p-0.5">
              <div
                className="tourera-liquid-fill h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.overallPercentage))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 5: Current Streak */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Top Streak</span>
            <div className="w-5.5 h-5.5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 dark:bg-[#faf6ee] text-amber-500 dark:text-[#b4881f] flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(246,218,126,0.3)] shrink-0">
              <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-amber-400 dark:fill-[#b4881f]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums flex items-baseline gap-1">
              <span>{bestHabit ? `${bestHabit.currentStreak}d` : '0d'}</span>
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={bestHabit?.habit.name}>
              {bestHabit ? bestHabit.habit.name : 'Start streak'}
            </div>
          </div>
        </div>

        {/* Metric 6: Monthly Goal */}
        <div className="tourera-glass-card rounded-2xl sm:rounded-3xl p-2.5 min-[360px]:p-3 sm:p-4.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">Month Goal</span>
            <div className="w-5.5 h-5.5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900 dark:bg-[#faf6ee] text-white dark:text-[#0f1013] flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(246,218,126,0.3)] shrink-0">
              <Target className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.monthlyGoal.targetPercentage}%
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5">
              {stats.overallPercentage >= stats.monthlyGoal.targetPercentage
                ? 'Goal Achieved 🎯'
                : `${(stats.monthlyGoal.targetPercentage - stats.overallPercentage).toFixed(1)}% to target`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
