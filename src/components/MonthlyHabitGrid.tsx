import React, { useMemo, useState } from 'react';
import { Habit, DailyStat } from '../types';
import { getDaysInMonth, getWeekGroups } from '../utils/dateUtils';
import { Edit2, Trash2, Plus, Check, RotateCcw } from 'lucide-react';
import { HabitCurvyGraph } from './HabitCurvyGraph';
import { ResetTicksModal, ResetScope } from './ResetTicksModal';

interface MonthlyHabitGridProps {
  habits: Habit[];
  checks: Record<string, boolean>;
  dailyStats: DailyStat[];
  year: number;
  month: number;
  monthName: string;
  onToggleCheck: (habitId: string, day: number) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: () => void;
  todayDate: Date;
  onResetMonthChecks?: () => void;
  onResetMonthTasks?: () => void;
  onResetMonthAll?: () => void;
  habitChecksCount?: number;
  completedTasksCount?: number;
}

export const MonthlyHabitGrid: React.FC<MonthlyHabitGridProps> = ({
  habits,
  checks,
  dailyStats,
  year,
  month,
  monthName,
  onToggleCheck,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
  todayDate,
  onResetMonthChecks,
  onResetMonthTasks,
  onResetMonthAll,
  habitChecksCount,
  completedTasksCount = 0,
}) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const weekGroups = useMemo(() => getWeekGroups(daysInMonth), [daysInMonth]);
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  // Memoize per-habit metrics so re-renders don't iterate across days for every habit
  const habitMetrics = useMemo(() => {
    return habits.map((habit) => {
      let completedCount = 0;
      let tempStreak = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        if (checks[`${habit.id}_${d}`]) {
          completedCount++;
          tempStreak++;
        } else {
          tempStreak = 0;
        }
      }

      let currentStreak = 0;
      let pointer = isCurrentMonth ? Math.min(daysInMonth, todayDate.getDate()) : daysInMonth;
      if (!checks[`${habit.id}_${pointer}`] && pointer > 1 && checks[`${habit.id}_${pointer - 1}`]) {
        pointer = pointer - 1;
      }
      while (pointer >= 1 && checks[`${habit.id}_${pointer}`]) {
        currentStreak++;
        pointer--;
      }

      const completionRate =
        daysInMonth > 0 ? Math.round((completedCount / daysInMonth) * 100) : 0;

      return {
        habit,
        completedCount,
        currentStreak,
        completionRate,
      };
    });
  }, [habits, checks, daysInMonth, isCurrentMonth, todayDate]);

  return (
    <section id="monthly-grid" className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-heading">
            Monthly Habit Grid · {monthName} {year}
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-num font-semibold px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 shadow-2xs">
            {habits.length} habits · {daysInMonth} days
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onResetMonthChecks && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              title={`Clear all ticks for ${monthName} ${year}`}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 shadow-2xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Clear Ticks</span>
            </button>
          )}

          <button
            onClick={onAddHabit}
            className="px-3.5 sm:px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 shadow-2xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {/* Main Transparent Table Sheet */}
      <div className="tourera-glass-card no-hover-lift rounded-2xl sm:rounded-3xl overflow-hidden border border-white/90 dark:border-white/10 shadow-md">
        <div className="overflow-x-auto scrollbar-none md:scrollbar-thin touch-pan-x">
          <table className="w-full text-xs text-slate-900 dark:text-slate-100 border-separate border-spacing-0 table-fixed select-none">
            {/* Week Headers Row */}
            <thead>
              <tr className="tourera-table-header text-slate-600 dark:text-slate-200">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 tourera-table-sticky-col border-r border-b border-slate-200/80 dark:border-white/10 p-2 sm:p-3.5 text-left font-bold text-slate-900 dark:text-white w-28 min-[380px]:w-36 sm:w-52 min-w-[116px] min-[380px]:min-w-[140px] sm:min-w-[210px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Habits</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-300 font-num hidden sm:inline">
                      (tap cell)
                    </span>
                  </div>
                </th>

                {weekGroups.map((group) => (
                  <th
                    key={group.weekNumber}
                    colSpan={group.days.length}
                    className="border-r border-b border-slate-200/60 dark:border-white/10 py-1.5 px-1.5 text-center text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wide bg-slate-100/60 dark:bg-white/5"
                  >
                    {group.label}
                  </th>
                ))}

                {/* Summary columns right header */}
                <th
                  colSpan={3}
                  className="py-1.5 px-2 text-center text-[11px] font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-white/10 border-l border-b border-slate-200/80 dark:border-white/10"
                >
                  Summary
                </th>
              </tr>

              {/* Day Number and Day Name Subheader Row */}
              <tr className="tourera-table-header text-slate-600 dark:text-slate-200">
                {dailyStats.map((dStat) => {
                  const isToday = dStat.day === todayDay;
                  return (
                    <th
                      key={dStat.day}
                      className={`py-1.5 px-1 text-center font-normal border-r border-b border-slate-200/50 dark:border-white/10 w-[34px] min-w-[34px] max-w-[34px] transition-colors ${
                        isToday
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold'
                          : 'hover:bg-slate-100/60 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`text-[10px] leading-tight ${isToday ? 'text-white/80 dark:text-slate-600' : 'text-slate-500 dark:text-slate-300'}`}>
                        {dStat.dayName}
                      </div>
                      <div
                        className={`text-[12px] font-num leading-tight mt-0.5 ${
                          isToday ? 'text-white dark:text-slate-950 font-black' : 'text-slate-900 dark:text-white font-bold'
                        }`}
                      >
                        {dStat.day}
                      </div>
                    </th>
                  );
                })}

                {/* Row Summary Headers */}
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-b border-slate-200/80 dark:border-white/10 min-w-[48px] bg-slate-100/50 dark:bg-white/5">
                  Done
                </th>
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-b border-slate-200/80 dark:border-white/10 min-w-[54px] bg-slate-100/50 dark:bg-white/5">
                  Rate
                </th>
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-b border-slate-200/80 dark:border-white/10 min-w-[48px] bg-slate-100/50 dark:bg-white/5">
                  Streak
                </th>
              </tr>
            </thead>

            {/* Habit Rows */}
            <tbody>
              {habitMetrics.map(({ habit, completedCount, currentStreak, completionRate }) => {
                return (
                  <tr
                    key={habit.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* Sticky Habit Column */}
                    <td className="sticky left-0 z-10 tourera-table-sticky-col group-hover:bg-white dark:group-hover:bg-slate-800/80 border-r border-b border-slate-200/80 dark:border-white/10 py-2 sm:py-2.5 px-2 sm:px-3.5 text-slate-900 dark:text-white font-medium">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          <span className="text-sm sm:text-base select-none shrink-0">
                            {habit.emoji}
                          </span>
                          <span
                            className="truncate text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white"
                            title={habit.name}
                          >
                            {habit.name}
                          </span>
                        </div>

                        {/* Actions - visible on mobile touch, subtle hover on desktop */}
                        <div className="opacity-70 sm:opacity-0 group-hover:opacity-100 flex items-center gap-0.5 sm:gap-1 transition-opacity shrink-0">
                          <button
                            onClick={() => onEditHabit(habit)}
                            title="Edit habit"
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteHabit(habit.id)}
                            title="Delete habit"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Day Checkbox Cells */}
                    {dailyStats.map((dStat) => {
                      const day = dStat.day;
                      const isDone = Boolean(checks[`${habit.id}_${day}`]);
                      const isToday = day === todayDay;

                      return (
                        <td
                          key={day}
                          onClick={() => onToggleCheck(habit.id, day)}
                          className={`p-0 text-center border-r border-b border-slate-200/50 dark:border-white/10 cursor-pointer transition-colors w-[34px] min-w-[34px] max-w-[34px] ${
                            isToday ? 'bg-slate-900/5 dark:bg-white/5' : ''
                          } hover:bg-white dark:hover:bg-white/10`}
                        >
                          <div className="w-full h-9 sm:h-8 flex items-center justify-center">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                isDone
                                  ? 'tourera-check-active'
                                  : 'tourera-check-empty'
                              }`}
                            >
                              {isDone && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Row Summary Columns */}
                    <td className="py-2.5 px-1 text-center font-num text-xs font-bold text-slate-900 dark:text-white border-l border-b border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {completedCount}
                    </td>
                    <td className="py-2.5 px-1 text-center font-num text-xs font-black text-slate-900 dark:text-white border-l border-b border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {completionRate}%
                    </td>
                    <td className="py-2.5 px-1 text-center font-num text-xs font-bold text-amber-600 dark:text-amber-400 border-l border-b border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {currentStreak > 0 ? `${currentStreak}d` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Calculation Rows */}
            <tfoot className="border-t border-slate-200/90 dark:border-white/15 font-num text-[11px]">
              {/* Row 1: Daily Progress % */}
              <tr className="bg-slate-100/60 dark:bg-white/5 font-bold text-slate-900 dark:text-white">
                <td className="sticky left-0 z-10 tourera-table-sticky-col border-r border-slate-200/80 dark:border-white/10 py-2 px-3.5 text-slate-700 dark:text-slate-200 font-sans font-bold text-xs">
                  Progress %
                </td>
                {dailyStats.map((dStat) => (
                  <td
                    key={dStat.day}
                    className={`py-2 px-1 text-center border-r border-slate-200/50 dark:border-white/10 ${
                      dStat.percentage === 100
                        ? 'text-slate-950 dark:text-white font-black'
                        : dStat.percentage >= 70
                        ? 'text-slate-800 dark:text-slate-100 font-bold'
                        : dStat.percentage > 0
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    {dStat.percentage}%
                  </td>
                ))}
                <td
                  colSpan={3}
                  className="py-2 px-2 text-center text-xs font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-white/10 border-l border-slate-200/80 dark:border-white/10 font-sans"
                >
                  Totals
                </td>
              </tr>

              {/* Row 2: Daily Done Count */}
              <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-900 dark:text-white">
                <td className="sticky left-0 z-10 tourera-table-sticky-col border-r border-slate-200/80 dark:border-white/10 py-2 px-3.5 text-slate-600 dark:text-slate-200 font-sans font-normal text-xs">
                  Done
                </td>
                {dailyStats.map((dStat) => (
                  <td
                    key={dStat.day}
                    className="py-2 px-1 text-center border-r border-slate-200/50 dark:border-white/10 font-bold w-[34px] min-w-[34px] max-w-[34px]"
                  >
                    {dStat.completedCount}
                  </td>
                ))}
                <td
                  colSpan={3}
                  className="py-2 px-2 text-center font-bold text-slate-900 dark:text-white bg-slate-100/50 dark:bg-white/10 border-l border-slate-200/80 dark:border-white/10"
                >
                  {dailyStats.reduce((acc, d) => acc + d.completedCount, 0)} completed
                </td>
              </tr>

              {/* Row 3: Daily Not Done Count */}
              <tr className="bg-white/40 dark:bg-transparent text-slate-500 dark:text-slate-300">
                <td className="sticky left-0 z-10 tourera-table-sticky-col border-r border-slate-200/80 dark:border-white/10 py-2 px-3.5 text-slate-500 dark:text-slate-300 font-sans font-normal text-xs">
                  Not Done
                </td>
                {dailyStats.map((dStat) => (
                  <td
                    key={dStat.day}
                    className="py-2 px-1 text-center border-r border-slate-200/50 dark:border-white/10 w-[34px] min-w-[34px] max-w-[34px]"
                  >
                    {dStat.notDoneCount}
                  </td>
                ))}
                <td
                  colSpan={3}
                  className="py-2 px-2 text-center text-slate-500 dark:text-slate-300 bg-white/40 dark:bg-transparent border-l border-slate-200/80 dark:border-white/10"
                >
                  {dailyStats.reduce((acc, d) => acc + d.notDoneCount, 0)} remaining
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Organic Curvy Circular Habit Velocity & Momentum Graph */}
        <HabitCurvyGraph
          habits={habits}
          checks={checks}
          dailyStats={dailyStats}
          year={year}
          month={month}
          monthName={monthName}
          daysInMonth={daysInMonth}
          todayDate={todayDate}
          onToggleCheck={onToggleCheck}
        />
      </div>

      {/* Quick Month Reset Modal for Clearing Ticks */}
      <ResetTicksModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        monthName={monthName}
        year={year}
        habitChecksCount={
          habitChecksCount ?? Object.values(checks || {}).filter(Boolean).length
        }
        completedTasksCount={completedTasksCount}
        initialScope="habits-only"
        onConfirmReset={(scope: ResetScope) => {
          if (scope === 'habits-only') onResetMonthChecks?.();
          else if (scope === 'tasks-only') onResetMonthTasks?.();
          else if (scope === 'all') onResetMonthAll?.();
        }}
      />
    </section>
  );
};
