import React from 'react';
import { WeeklyStat } from '../types';

interface WeeklySummaryProps {
  weeklyStats: WeeklyStat[];
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ weeklyStats }) => {
  return (
    <section id="weekly-summary" className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Weekly Performance</span>
        </h2>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 shadow-2xs">
          Aggregated by week
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {weeklyStats.map((week) => {
          const isHighVelocity = week.percentage >= 75;
          return (
            <div
              key={week.weekNumber}
              className={`tourera-glass-card rounded-3xl p-5 flex flex-col justify-between transition-all ${
                isHighVelocity ? 'ring-1 ring-slate-900/10 dark:ring-white/25' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                    {week.weekLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-white/10 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-white/15">
                    d{week.days[0]}–{week.days[week.days.length - 1]}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-3 mb-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                    {week.percentage}%
                  </span>
                  <span className="text-xs font-mono tabular-nums font-bold text-slate-600 dark:text-slate-300">
                    {week.completedCount} / {week.totalPossible}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full tourera-progress-track rounded-full h-2 overflow-hidden my-3 p-0.5">
                  <div
                    className="tourera-liquid-fill h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, week.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                <span
                  className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-[11px] ${
                    week.percentage >= 80
                      ? 'text-white dark:text-slate-950 bg-slate-900 dark:bg-white'
                      : week.percentage >= 60
                      ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-white/20'
                      : week.percentage > 0
                      ? 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10'
                      : 'text-slate-500 dark:text-slate-300 bg-slate-100/60 dark:bg-white/5'
                  }`}
                >
                  {week.percentage >= 80
                    ? 'Optimal'
                    : week.percentage >= 60
                    ? 'On Track'
                    : week.percentage > 0
                    ? 'Pacing'
                    : 'Pending'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
