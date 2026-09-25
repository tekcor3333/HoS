import React from 'react';
import { MONTH_NAMES } from '../utils/dateUtils';
import { getMonthStorageKey } from '../utils/habitStorage';
import { ChevronRight, Copy } from 'lucide-react';

interface MonthlyHistoryProps {
  currentYear: number;
  currentMonth: number;
  onSelectMonth: (month: number) => void;
  onCloneToMonth: (targetMonth: number) => void;
}

export const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({
  currentYear,
  currentMonth,
  onSelectMonth,
  onCloneToMonth,
}) => {
  return (
    <section id="history" className="mb-12">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Archives · {currentYear}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {MONTH_NAMES.map((name, index) => {
          const mNum = index + 1;
          const isSelected = mNum === currentMonth;

          let habitCount = 0;
          let completionRate = 0;
          let isInitialized = false;

          try {
            const key = getMonthStorageKey(currentYear, mNum);
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              habitCount = parsed.habits?.length || 0;
              const checksCount = Object.values(parsed.checks || {}).filter(Boolean).length;
              const totalPossible = (habitCount * 30) || 1;
              completionRate = Math.min(100, Math.round((checksCount / totalPossible) * 100));
              isInitialized = true;
            }
          } catch (e) {
            // fallback
          }

          return (
            <div
              key={name}
              className={`p-4.5 rounded-3xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-white dark:bg-slate-800 border-slate-900/40 dark:border-white/40 shadow-md ring-2 ring-slate-900/10 dark:ring-white/10'
                  : 'tourera-glass-card hover:bg-white dark:hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-white dark:text-slate-950 bg-slate-900 dark:bg-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {isInitialized ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono tabular-nums">
                        <span>{habitCount} Habits</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {completionRate}%
                        </span>
                      </div>
                      <div className="w-full tourera-progress-track rounded-full h-1.5 overflow-hidden p-0.5">
                        <div
                          className="tourera-liquid-fill h-full rounded-full"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 italic">Unopened</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectMonth(mNum)}
                  className="font-bold text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer hover:translate-x-0.5 transition-transform"
                >
                  <span>{isSelected ? 'Viewing' : 'Open'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {!isSelected && (
                  <button
                    onClick={() => onCloneToMonth(mNum)}
                    title="Clone current habit setup into this month"
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
