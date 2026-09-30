import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MonthOverviewStats } from '../types';
import { MONTH_NAMES } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Check, Copy } from 'lucide-react';

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyOverviewProps {
  year: number;
  month: number;
  stats: MonthOverviewStats;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDuplicateMonth: () => void;
}

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({
  year,
  month,
  stats,
  onMonthChange,
  onYearChange,
  onDuplicateMonth,
}) => {
  const currentMonthName = MONTH_NAMES[month - 1];

  const trackRef = useRef<HTMLDivElement>(null);
  const monthButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillGeometry, setPillGeometry] = useState<{ left: number; width: number }>({ left: 6, width: 72 });
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [dragHoverMonth, setDragHoverMonth] = useState<number | null>(null);
  const [dragPillLeft, setDragPillLeft] = useState<number | null>(null);

  const activeDisplayMonth = dragHoverMonth ?? month;
  const activeMonthIndex = activeDisplayMonth - 1;

  // Measure and align the liquid water bar to the active month button
  const updatePillToMonth = useCallback((targetMonth: number) => {
    const idx = targetMonth - 1;
    const btn = monthButtonRefs.current[idx];
    const track = trackRef.current;
    if (btn && track) {
      const btnRect = btn.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const left = btnRect.left - trackRect.left;
      const width = btnRect.width;
      setPillGeometry({ left, width });
    }
  }, []);

  useEffect(() => {
    if (!isSliding) {
      updatePillToMonth(month);
    }
  }, [month, isSliding, updatePillToMonth]);

  useEffect(() => {
    const handleResize = () => {
      if (!isSliding) {
        updatePillToMonth(month);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [month, isSliding, updatePillToMonth]);

  // Determine closest month from client X coordinate
  const getMonthFromPointerX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return month;
    const trackRect = track.getBoundingClientRect();
    const relativeX = clientX - trackRect.left;

    let closestMonth = 1;
    let minDistance = Infinity;

    monthButtonRefs.current.forEach((btn, idx) => {
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const btnCenterX = btnRect.left - trackRect.left + btnRect.width / 2;
        const dist = Math.abs(relativeX - btnCenterX);
        if (dist < minDistance) {
          minDistance = dist;
          closestMonth = idx + 1;
        }
      }
    });

    return closestMonth;
  }, [month]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsSliding(true);

    const track = trackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const relativeX = e.clientX - trackRect.left;
      const targetMonth = getMonthFromPointerX(e.clientX);
      setDragHoverMonth(targetMonth);
      setDragPillLeft(Math.max(6, Math.min(trackRect.width - pillGeometry.width - 6, relativeX - pillGeometry.width / 2)));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    const track = trackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const relativeX = e.clientX - trackRect.left;
      const targetMonth = getMonthFromPointerX(e.clientX);
      setDragHoverMonth(targetMonth);
      setDragPillLeft(Math.max(6, Math.min(trackRect.width - pillGeometry.width - 6, relativeX - pillGeometry.width / 2)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const finalMonth = dragHoverMonth ?? getMonthFromPointerX(e.clientX);
    setIsSliding(false);
    setDragPillLeft(null);
    setDragHoverMonth(null);

    // Stop and open that month page!
    onMonthChange(finalMonth);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      onYearChange(year - 1);
      onMonthChange(12);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onYearChange(year + 1);
      onMonthChange(1);
    } else {
      onMonthChange(month + 1);
    }
  };

  return (
    <section id="overview" className="mb-8 relative">
      {/* 1. Breadcrumb & Year Selector */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium tourera-glass-card px-3.5 py-1.5 rounded-full">
          <span
            className="font-bold tracking-tight text-slate-950 dark:text-white text-sm"
            style={{
              fontFamily: '"Bodoni Moda", "Playfair Display", "DM Serif Display", "Times New Roman", serif',
            }}
          >
            HoS
          </span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span>Workspace</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-900 dark:text-white font-bold">{currentMonthName} {year}</span>
        </div>

        <div className="flex items-center gap-1 tourera-glass-card p-1 rounded-full border border-white/80 dark:border-white/15 shadow-xs">
          <button
            onClick={handlePrevMonth}
            title="Previous month"
            className="p-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2.5 text-xs font-bold text-slate-900 dark:text-white font-mono">
            {year}
          </span>
          <button
            onClick={handleNextMonth}
            title="Next month"
            className="p-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Hero Header Area (Matching reference screenshot typography hierarchy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white"
            style={{
              fontFamily: '"Bodoni Moda", "Playfair Display", "Cinzel", "Newsreader", "DM Serif Display", Georgia, serif',
              letterSpacing: '-0.02em',
            }}
          >
            My Habit Tracker
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#ecdab4] font-serif italic mt-1.5">
            Build unbreakable daily rhythm. Even on the days you want to slow down.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDuplicateMonth}
            className="tourera-pill-btn-white px-4 py-2 font-bold text-xs text-slate-900 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Copy className="w-3.5 h-3.5 text-slate-700 dark:text-slate-800 shrink-0" />
            <span>Clone habits</span>
          </button>
        </div>
      </div>

      {/* 3. Symmetrically Aligned Month Switcher Bar with Liquid Moving Water Capsule */}
      <div className="w-full flex justify-center py-2.5 mb-6 overflow-x-auto scrollbar-none">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="tourera-glass-card no-hover-lift hover:!transform-none hover:!translate-y-0 p-1.5 rounded-full relative flex items-center justify-between border border-white/80 dark:border-white/15 shadow-sm max-w-full select-none cursor-pointer group"
          style={{
            width: '949.888px',
            transform: 'none',
          }}
          title="Slide to browse and open any month"
        >
          {/* Draggable Liquid Moving Water Bar */}
          <div
            className={`liquid-water-bar absolute top-1.5 bottom-1.5 rounded-full pointer-events-none z-0 ${
              isSliding ? 'liquid-water-bar-active' : ''
            }`}
            style={{
              left: `${isSliding && dragPillLeft !== null ? dragPillLeft : pillGeometry.left}px`,
              width: `${pillGeometry.width}px`,
              transition: isSliding
                ? 'transform 0.15s ease, width 0.15s ease'
                : 'left 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease',
            }}
          >
            {/* Top Liquid Specular Glint */}
            <div className="absolute top-1 inset-x-2 h-1 rounded-full bg-white/90 dark:bg-white/95 blur-[0.4px] pointer-events-none" />
            {/* Center fluid highlight */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/5 dark:from-white/20 dark:to-transparent pointer-events-none" />
          </div>

          {/* 12 Months with Professional Architectural Separation */}
          {SHORT_MONTH_NAMES.map((name, index) => {
            const mNum = index + 1;
            const isActive = mNum === activeDisplayMonth;
            const isNearActive = index === activeMonthIndex || index === activeMonthIndex + 1;

            return (
              <React.Fragment key={name}>
                {/* Clean Professional Separation Line between Months */}
                {index > 0 && (
                  <div
                    className="w-px h-3.5 bg-slate-400/30 dark:bg-white/15 shrink-0 pointer-events-none transition-opacity duration-200"
                    style={{ opacity: isNearActive ? 0 : 1 }}
                  />
                )}

                <button
                  ref={(el) => {
                    monthButtonRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (!isSliding) {
                      onMonthChange(mNum);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 sm:px-2.5 rounded-full text-center relative z-10 transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'text-slate-950 dark:text-white font-extrabold scale-105'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold'
                  }`}
                  style={{
                    fontSize: '12px',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span className="tracking-tight">{name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 4. High-Contrast Tourera Hero Card */}
      <div className="tourera-dark-card rounded-3xl p-6 sm:p-7 relative overflow-hidden text-slate-900 dark:text-white">
        {/* Subtle Specular Top Reflection */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Month title & Counts */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentMonthName}
              </span>
              <span className="px-3 py-0.5 text-xs font-semibold text-slate-700 dark:text-white/90 bg-slate-900/5 dark:bg-white/10 backdrop-blur-md rounded-full border border-slate-900/10 dark:border-white/20">
                {stats.totalDaysInMonth} Days
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
              <div className="bg-slate-900/5 dark:bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-slate-900/10 dark:border-white/10">
                <div className="text-slate-600 dark:text-slate-300 font-medium">Number of habits</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                  {stats.totalHabits}
                </div>
              </div>
              <div className="bg-slate-900/5 dark:bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-slate-900/10 dark:border-white/10">
                <div className="text-slate-600 dark:text-slate-300 font-medium">Completed check-ins</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 flex items-baseline gap-1">
                  <span>{stats.totalCompletedCheckins}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-300">
                    / {stats.totalPossibleCheckins}
                  </span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-slate-900/5 dark:bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-slate-900/10 dark:border-white/10">
                <div className="text-slate-600 dark:text-slate-300 font-medium">Remaining to 100%</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                  {Math.max(0, stats.totalPossibleCheckins - stats.totalCompletedCheckins)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Floating Tourera Liquid Glass Progress Box */}
          <div className="lg:min-w-[340px] flex flex-col justify-center bg-white/70 dark:bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/80 dark:border-white/20 shadow-xl">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Progress in %
              </span>
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {stats.overallPercentage.toFixed(2)}%
              </span>
            </div>

            {/* Specular Liquid Capsule Track */}
            <div className="w-full h-4 bg-slate-200 dark:bg-black/60 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-[#f6da7e]/30 shadow-inner">
              <div
                className="h-full bg-slate-900 dark:bg-gradient-to-r dark:from-[#f6da7e] dark:via-[#fff1bd] dark:to-[#f6da7e] rounded-full transition-all duration-700 ease-out shadow-sm dark:shadow-[0_0_12px_rgba(246,218,126,0.65)]"
                style={{ width: `${Math.min(100, Math.max(0, stats.overallPercentage))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-200 mt-3 font-mono tabular-nums">
              <span>Target: {stats.monthlyGoal.targetPercentage}%</span>
              <span>
                {stats.overallPercentage >= stats.monthlyGoal.targetPercentage ? (
                  <span className="text-slate-900 dark:text-[#f6da7e] font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-slate-900 dark:text-[#f6da7e]" /> Target Reached
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-200">
                    {(stats.monthlyGoal.targetPercentage - stats.overallPercentage).toFixed(1)}% to goal
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
