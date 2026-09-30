import React from 'react';
import { Habit, DailyStat } from '../types';
import { getDaysInMonth, getWeekGroups } from '../utils/dateUtils';
import { Edit2, Trash2, Plus, Check } from 'lucide-react';
import { DailyTaskProgressSection } from './DailyTaskProgressSection';

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
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const weekGroups = getWeekGroups(daysInMonth);
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  // Area chart for trend
  const chartWidth = 960;
  const chartHeight = 80;
  const paddingX = 20;
  const paddingY = 10;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = dailyStats.map((stat, index) => {
    const x = paddingX + (index / (dailyStats.length - 1 || 1)) * usableWidth;
    const y = chartHeight - paddingY - (stat.percentage / 100) * usableHeight;
    return { x, y, percentage: stat.percentage, day: stat.day };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
    : '';

  return (
    <section id="monthly-grid" className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Habit Grid · {monthName} {year}
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 shadow-2xs">
            {habits.length} habits · {daysInMonth} days
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddHabit}
            className="px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 shadow-2xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {/* Main Transparent Table Sheet */}
      <div className="tourera-glass-card rounded-3xl overflow-hidden border border-white/90 dark:border-white/10 shadow-md">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-slate-900 dark:text-slate-100 border-collapse select-none">
            {/* Week Headers Row */}
            <thead>
              <tr className="tourera-table-header border-b border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-200">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 tourera-table-sticky-col border-r border-slate-200/80 dark:border-white/10 p-3.5 text-left font-bold text-slate-900 dark:text-white w-52 min-w-[210px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Habits</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-300 font-mono">
                      (tap cell)
                    </span>
                  </div>
                </th>

                {weekGroups.map((group) => (
                  <th
                    key={group.weekNumber}
                    colSpan={group.days.length}
                    className="border-r border-slate-200/60 dark:border-white/10 py-1.5 px-1.5 text-center text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wide bg-slate-100/60 dark:bg-white/5"
                  >
                    {group.label}
                  </th>
                ))}

                {/* Summary columns right header */}
                <th
                  colSpan={3}
                  className="py-1.5 px-2 text-center text-[11px] font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-white/10 border-l border-slate-200/80 dark:border-white/10"
                >
                  Summary
                </th>
              </tr>

              {/* Day Number and Day Name Subheader Row */}
              <tr className="tourera-table-header border-b border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-200">
                {dailyStats.map((dStat) => {
                  const isToday = dStat.day === todayDay;
                  return (
                    <th
                      key={dStat.day}
                      className={`py-1.5 px-1 text-center font-normal border-r border-slate-200/50 dark:border-white/10 w-[34px] min-w-[34px] max-w-[34px] transition-colors ${
                        isToday
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold'
                          : 'hover:bg-slate-100/60 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`text-[10px] leading-tight ${isToday ? 'text-white/80 dark:text-slate-600' : 'text-slate-500 dark:text-slate-300'}`}>
                        {dStat.dayName}
                      </div>
                      <div
                        className={`text-[12px] font-mono tabular-nums leading-tight mt-0.5 ${
                          isToday ? 'text-white dark:text-slate-950 font-black' : 'text-slate-900 dark:text-white font-bold'
                        }`}
                      >
                        {dStat.day}
                      </div>
                    </th>
                  );
                })}

                {/* Row Summary Headers */}
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200/80 dark:border-white/10 min-w-[48px] bg-slate-100/50 dark:bg-white/5">
                  Done
                </th>
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200/80 dark:border-white/10 min-w-[54px] bg-slate-100/50 dark:bg-white/5">
                  Rate
                </th>
                <th className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200/80 dark:border-white/10 min-w-[48px] bg-slate-100/50 dark:bg-white/5">
                  Streak
                </th>
              </tr>
            </thead>

            {/* Habit Rows */}
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {habits.map((habit) => {
                let completedCount = 0;
                let currentStreak = 0;
                let tempStreak = 0;

                for (let d = 1; d <= daysInMonth; d++) {
                  if (checks[`${habit.id}_${d}`]) {
                    completedCount++;
                    tempStreak++;
                  } else {
                    tempStreak = 0;
                  }
                }

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

                return (
                  <tr
                    key={habit.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* Sticky Habit Column */}
                    <td className="sticky left-0 z-10 tourera-table-sticky-col group-hover:bg-white dark:group-hover:bg-slate-800/80 border-r border-slate-200/80 dark:border-white/10 py-2.5 px-3.5 text-slate-900 dark:text-white font-medium">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base select-none shrink-0">
                            {habit.emoji}
                          </span>
                          <span
                            className="truncate text-xs font-bold text-slate-900 dark:text-white"
                            title={habit.name}
                          >
                            {habit.name}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
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
                          className={`p-0 text-center border-r border-slate-200/50 dark:border-white/10 cursor-pointer transition-colors w-[34px] min-w-[34px] max-w-[34px] ${
                            isToday ? 'bg-slate-900/5 dark:bg-white/5' : ''
                          } hover:bg-white dark:hover:bg-white/10`}
                        >
                          <div className="w-full h-8 flex items-center justify-center">
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
                    <td className="py-2.5 px-1 text-center font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-white border-l border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {completedCount}
                    </td>
                    <td className="py-2.5 px-1 text-center font-mono tabular-nums text-xs font-black text-slate-900 dark:text-white border-l border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {completionRate}%
                    </td>
                    <td className="py-2.5 px-1 text-center font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-amber-400 border-l border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">
                      {currentStreak > 0 ? `${currentStreak}d` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Calculation Rows */}
            <tfoot className="border-t border-slate-200/90 dark:border-white/15 font-mono text-[11px] tabular-nums">
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

        {/* Daily Progress Trend Chart Area */}
        <div className="p-4 sm:p-5 bg-white/40 dark:bg-white/5 border-t border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Completion Velocity Curve</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
              <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
                Peak: <strong className="text-slate-950 dark:text-white">{Math.max(...dailyStats.map((d) => d.percentage), 0)}%</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
                Average: <strong className="text-slate-950 dark:text-white">{Math.round(dailyStats.reduce((a, b) => a + b.percentage, 0) / (dailyStats.length || 1))}%</strong>
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden bg-white/80 dark:bg-slate-950/60 rounded-2xl p-3 border border-white dark:border-white/10 shadow-2xs">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-24 overflow-visible"
            >
              <defs>
                <linearGradient id="toureraTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {areaD && (
                <path d={areaD} fill="url(#toureraTrendGradient)" className="text-slate-900 dark:text-[#f6da7e]" />
              )}

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-900 dark:text-[#f6da7e]"
                />
              )}

              {points.map((pt) => (
                <circle
                  key={pt.day}
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.day === todayDay ? 4.5 : 2.5}
                  className={
                    pt.day === todayDay
                      ? 'fill-slate-950 dark:fill-[#f6da7e] stroke-2 stroke-white dark:stroke-[#0c0d11]'
                      : 'fill-slate-700 dark:fill-[#ecd06c]'
                  }
                >
                  <title>{`Day ${pt.day}: ${pt.percentage}%`}</title>
                </circle>
              ))}
            </svg>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono px-2 pt-1.5 border-t border-slate-100 dark:border-white/10">
              <span>Day 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span>Day {daysInMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW DAILY TASK + PROGRESS SECTION (Directly after Habit Grid & Graph) */}
      <DailyTaskProgressSection
        habits={habits}
        checks={checks}
        dailyStats={dailyStats}
        year={year}
        month={month}
        monthName={monthName}
        onToggleCheck={onToggleCheck}
        todayDate={todayDate}
      />
    </section>
  );
};
