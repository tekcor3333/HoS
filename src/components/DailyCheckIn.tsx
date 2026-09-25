import React, { useState } from 'react';
import { Habit } from '../types';
import { getDayOfWeek, getDaysInMonth } from '../utils/dateUtils';
import { Check, CheckCheck, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyCheckInProps {
  habits: Habit[];
  checks: Record<string, boolean>;
  year: number;
  month: number;
  onToggleCheck: (habitId: string, day: number) => void;
  onBatchToggle: (day: number, state: boolean) => void;
  todayDate: Date;
}

export const DailyCheckIn: React.FC<DailyCheckInProps> = ({
  habits,
  checks,
  year,
  month,
  onToggleCheck,
  onBatchToggle,
  todayDate,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  
  const initialDay = isCurrentMonth ? Math.min(daysInMonth, todayDate.getDate()) : 1;
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  const { shortName, fullName } = getDayOfWeek(year, month, selectedDay);
  const isSelectedToday = isCurrentMonth && selectedDay === todayDate.getDate();

  const completedCount = habits.filter((h) => Boolean(checks[`${h.id}_${selectedDay}`])).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (habitId: string) => {
    const wasChecked = Boolean(checks[`${habitId}_${selectedDay}`]);
    onToggleCheck(habitId, selectedDay);

    if (!wasChecked && completedCount + 1 === totalCount && totalCount > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#334155', '#475569', '#cbd5e1'],
      });
    }
  };

  const handleCheckAll = () => {
    onBatchToggle(selectedDay, true);
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#0f172a', '#334155', '#475569', '#cbd5e1'],
    });
  };

  const handleClearAll = () => {
    onBatchToggle(selectedDay, false);
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const startDay = Math.max(1, selectedDay - 3);
  const endDay = Math.min(daysInMonth, startDay + 6);
  const stripDays: number[] = [];
  for (let d = startDay; d <= endDay; d++) {
    stripDays.push(d);
  }

  return (
    <section id="daily-checkin" className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Daily Check-In
          </h2>
          {isSelectedToday && (
            <span className="px-3 py-0.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 shadow-2xs rounded-full">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-white/80 dark:border-white/15 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
            <span>Clear Day</span>
          </button>
          <button
            onClick={handleCheckAll}
            className="px-3.5 py-1.5 text-xs font-bold text-white dark:text-slate-950 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Done</span>
          </button>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className={`tourera-glass-card rounded-3xl p-5 sm:p-6 transition-all ${
        isSelectedToday ? 'ring-2 ring-slate-900/10 dark:ring-white/10' : ''
      }`}>
        {/* Horizontal Mini Day Selector Strip - Inspired by Tourera Pebble Bar */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200/60 dark:border-white/10 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-2 min-w-max">
            {stripDays.map((dayNum) => {
              const dInfo = getDayOfWeek(year, month, dayNum);
              const isCurrent = dayNum === selectedDay;

              const dCompleted = habits.filter((h) => Boolean(checks[`${h.id}_${dayNum}`])).length;
              const dAll = habits.length;
              const dDone = dAll > 0 && dCompleted === dAll;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`px-3.5 py-2 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center min-w-[56px] ${
                    isCurrent
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md scale-102 font-bold'
                      : 'bg-white/60 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 border border-white/80 dark:border-white/10'
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isCurrent ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {dInfo.shortName}
                  </span>
                  <span
                    className={`text-sm font-black font-mono mt-0.5 ${
                      isCurrent ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-1 flex items-center justify-center">
                    {dDone ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ) : (
                      <span className={`text-[10px] font-mono leading-none ${
                        isCurrent ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {dCompleted}/{dAll}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {fullName}, Day {selectedDay}
            </span>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              {completedCount} of {totalCount} habits completed
            </div>
          </div>
        </div>

        {/* Layout: Circular Liquid Glass Gauge + Habit List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Circular Liquid Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-5 bg-white/40 dark:bg-white/5 rounded-3xl border border-white/80 dark:border-white/10">
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  className="text-black/10 dark:text-white/10"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  className="text-slate-900 dark:text-white transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {percentage}%
                </span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                  {completedCount}/{totalCount} Done
                </span>
              </div>
            </div>

            <div className="mt-3.5 text-center">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {percentage === 100
                  ? 'All habits completed 🎉'
                  : percentage >= 70
                  ? 'Strong momentum'
                  : percentage > 0
                  ? 'Active progress'
                  : 'Ready to check in'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Day {selectedDay} consistency
              </p>
            </div>
          </div>

          {/* Habit Check-In Clickable List */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {habits.map((habit) => {
                const isChecked = Boolean(checks[`${habit.id}_${selectedDay}`]);

                return (
                  <div
                    key={habit.id}
                    onClick={() => handleToggle(habit.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm'
                        : 'bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white border-white/90 dark:border-white/10 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-xl shrink-0 select-none">{habit.emoji}</span>
                      <div className="truncate">
                        <span
                          className={`text-xs font-bold truncate block ${
                            isChecked
                              ? 'line-through text-slate-300 dark:text-slate-600'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {habit.name}
                        </span>
                        <span className={`text-[10px] block ${
                          isChecked
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-500 dark:text-slate-300'
                        }`}>
                          {habit.category}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white border-white dark:border-slate-800 font-bold'
                          : 'tourera-check-empty'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
