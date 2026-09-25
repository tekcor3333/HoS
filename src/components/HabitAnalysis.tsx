import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { HabitStats } from '../types';
import { ArrowUpDown, Flame } from 'lucide-react';

interface HabitAnalysisProps {
  habitStats: HabitStats[];
  onSelectHabit?: (habitId: string) => void;
}

type SortKey = 'name' | 'targetDays' | 'completedDays' | 'missedDays' | 'completionRate' | 'currentStreak';

export const HabitAnalysis: React.FC<HabitAnalysisProps> = ({ habitStats }) => {
  const [sortKey, setSortKey] = useState<SortKey>('completionRate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 6, width: 52 });
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [dragPillLeft, setDragPillLeft] = useState<number | null>(null);
  const [dragPillWidth, setDragPillWidth] = useState<number | null>(null);
  const [dragHoverCategory, setDragHoverCategory] = useState<string | null>(null);

  const isSlidingRef = useRef<boolean>(false);
  const dragClientXRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filter out Health & Wellness category
  const categories = useMemo(() => {
    return Array.from(new Set(habitStats.map((s) => s.habit.category)))
      .filter((cat) => !cat.toLowerCase().includes('wellness'));
  }, [habitStats]);

  const allCategoryList = useMemo(() => ['all', ...categories], [categories]);

  // Ensure selectedCategory is valid
  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const updatePillPosition = useCallback(() => {
    const targetCat = dragHoverCategory || selectedCategory;
    const btn = buttonRefs.current.get(targetCat) || buttonRefs.current.get('all');
    if (btn) {
      setPillStyle({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
      });
    }
  }, [selectedCategory, dragHoverCategory]);

  useEffect(() => {
    updatePillPosition();
    const handleResize = () => updatePillPosition();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(updatePillPosition, 60);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [updatePillPosition, categories]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const getCategoryFromContentX = useCallback(
    (contentX: number): { cat: string; width: number; left: number } => {
      let closestCat = 'all';
      let closestWidth = 52;
      let closestLeft = 6;
      let minDistance = Infinity;

      allCategoryList.forEach((cat) => {
        const btn = buttonRefs.current.get(cat);
        if (btn) {
          const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
          const dist = Math.abs(contentX - btnCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestCat = cat;
            closestWidth = btn.offsetWidth;
            closestLeft = btn.offsetLeft;
          }
        }
      });

      return { cat: closestCat, width: closestWidth, left: closestLeft };
    },
    [allCategoryList]
  );

  // Smooth edge auto-scrolling loop: automatically scrolls the long bar when reaching near the edges
  const runEdgeScrollLoop = useCallback(() => {
    if (!isSlidingRef.current || !trackRef.current) return;
    const track = trackRef.current;
    const trackRect = track.getBoundingClientRect();
    const clientX = dragClientXRef.current;

    let didScroll = false;
    const edgeThreshold = 65; // px from edge

    if (clientX > trackRect.right - edgeThreshold) {
      const ratio = Math.min(1, Math.max(0.2, (clientX - (trackRect.right - edgeThreshold)) / edgeThreshold));
      const step = Math.max(3, Math.round(ratio * 14));
      if (track.scrollLeft < track.scrollWidth - track.clientWidth) {
        track.scrollLeft += step;
        didScroll = true;
      }
    } else if (clientX < trackRect.left + edgeThreshold) {
      const ratio = Math.min(1, Math.max(0.2, ((trackRect.left + edgeThreshold) - clientX) / edgeThreshold));
      const step = Math.max(3, Math.round(ratio * 14));
      if (track.scrollLeft > 0) {
        track.scrollLeft -= step;
        didScroll = true;
      }
    }

    if (didScroll) {
      const contentX = clientX - trackRect.left + track.scrollLeft;
      const target = getCategoryFromContentX(contentX);
      setDragHoverCategory(target.cat);
      setDragPillWidth(target.width);
      setDragPillLeft(Math.max(6, Math.min(track.scrollWidth - target.width - 6, contentX - target.width / 2)));
    }

    animFrameRef.current = requestAnimationFrame(runEdgeScrollLoop);
  }, [getCategoryFromContentX]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isSlidingRef.current = true;
    dragClientXRef.current = e.clientX;
    setIsSliding(true);

    const track = trackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const contentX = e.clientX - trackRect.left + track.scrollLeft;
      const target = getCategoryFromContentX(contentX);
      setDragHoverCategory(target.cat);
      setDragPillWidth(target.width);
      setDragPillLeft(Math.max(6, Math.min(track.scrollWidth - target.width - 6, contentX - target.width / 2)));

      // Synchronize the long bar's scroll position with the movement of the liquid bar
      const targetScroll = contentX - track.clientWidth / 2;
      track.scrollLeft = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, targetScroll));
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(runEdgeScrollLoop);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSlidingRef.current) return;
    dragClientXRef.current = e.clientX;

    const track = trackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const contentX = e.clientX - trackRect.left + track.scrollLeft;
      const target = getCategoryFromContentX(contentX);
      setDragHoverCategory(target.cat);
      setDragPillWidth(target.width);
      setDragPillLeft(Math.max(6, Math.min(track.scrollWidth - target.width - 6, contentX - target.width / 2)));

      // Long bar moves accordingly with how you move the liquid bar
      const targetScroll = contentX - track.clientWidth / 2;
      track.scrollLeft = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, targetScroll));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSlidingRef.current) return;
    isSlidingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const track = trackRef.current;
    let finalCat = selectedCategory;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const contentX = e.clientX - trackRect.left + track.scrollLeft;
      const target = getCategoryFromContentX(contentX);
      finalCat = dragHoverCategory || target.cat;
    }

    setIsSliding(false);
    setDragPillLeft(null);
    setDragPillWidth(null);
    setDragHoverCategory(null);
    setSelectedCategory(finalCat);

    // Smoothly reveal and center the active category in the long bar
    const btn = buttonRefs.current.get(finalCat);
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    const btn = buttonRefs.current.get(cat);
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filteredStats = habitStats.filter((s) =>
    selectedCategory === 'all' ? true : s.habit.category === selectedCategory
  );

  const sortedStats = [...filteredStats].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sortKey) {
      case 'name':
        valA = a.habit.name.toLowerCase();
        valB = b.habit.name.toLowerCase();
        break;
      case 'targetDays':
        valA = a.targetDays;
        valB = b.targetDays;
        break;
      case 'completedDays':
        valA = a.completedDays;
        valB = b.completedDays;
        break;
      case 'missedDays':
        valA = a.missedDays;
        valB = b.missedDays;
        break;
      case 'completionRate':
        valA = a.completionRate;
        valB = b.completionRate;
        break;
      case 'currentStreak':
        valA = a.currentStreak;
        valB = b.currentStreak;
        break;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const activeLeft = isSliding && dragPillLeft !== null ? dragPillLeft : pillStyle.left;
  const activeWidth = isSliding && dragPillWidth !== null ? dragPillWidth : pillStyle.width;
  const currentActiveCat = isSliding && dragHoverCategory ? dragHoverCategory : selectedCategory;

  return (
    <section id="habit-analysis" className="mb-8">
      {/* Symmetrically Centered Category Switcher Bar with Upper Liquid Bar Styling & Thickness */}
      <div className="w-full flex justify-center py-2.5 mb-5 overflow-x-auto scrollbar-none">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="tourera-glass-card no-hover-lift hover:!transform-none hover:!translate-y-0 p-1.5 rounded-full relative flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-sm select-none cursor-grab active:cursor-grabbing touch-none max-w-full border border-white/80 dark:border-white/15"
          style={{
            scrollBehavior: isSliding ? 'auto' : 'smooth',
            transform: 'none',
          }}
          title="Click or slide across the liquid bar to browse categories"
        >
          {/* Draggable Liquid Moving Water Bar matching upper month liquid bar */}
          <div
            className={`liquid-water-bar absolute top-1.5 bottom-1.5 rounded-full pointer-events-none z-0 ${
              isSliding ? 'liquid-water-bar-active' : ''
            }`}
            style={{
              left: `${activeLeft}px`,
              width: `${activeWidth}px`,
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

          <button
            ref={(el) => {
              if (el) buttonRefs.current.set('all', el);
            }}
            onClick={() => handleCategoryClick('all')}
            className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center ${
              currentActiveCat === 'all'
                ? 'text-slate-950 dark:text-white font-extrabold scale-105'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              ref={(el) => {
                if (el) buttonRefs.current.set(cat, el);
              }}
              onClick={() => handleCategoryClick(cat)}
              className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center ${
                currentActiveCat === cat
                  ? 'text-slate-950 dark:text-white font-extrabold scale-105'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Table Sheet */}
      <div className="tourera-glass-card rounded-3xl overflow-hidden border border-white/90 dark:border-white/10 shadow-md">
        <div className="overflow-x-auto scrollbar-glass">
          <table className="w-full text-left text-xs text-slate-900 dark:text-slate-100 border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Habit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('targetDays')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Target</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('completedDays')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Completed</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('missedDays')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Missed</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('completionRate')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Rate %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentStreak')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Streak</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center">
                  Longest
                </th>
                <th className="py-3.5 px-4 min-w-[210px]">
                  Visual Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 font-normal">
              {sortedStats.map((stat) => {
                const habit = stat.habit;

                return (
                  <tr
                    key={stat.habitId}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* Habit Name + Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/15 shadow-2xs flex items-center justify-center text-base shrink-0">
                          {habit.emoji}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {habit.name}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {habit.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Goal */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                      {stat.targetDays}
                    </td>

                    {/* Actual / Completed */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-black text-slate-950 dark:text-white bg-slate-100/40 dark:bg-white/5">
                      {stat.completedDays}
                    </td>

                    {/* Missed */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {stat.missedDays}
                    </td>

                    {/* Completion % */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-black text-slate-900 dark:text-white">
                      {stat.completionRate.toFixed(1)}%
                    </td>

                    {/* Current Streak */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums">
                      {stat.currentStreak > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15">
                          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{stat.currentStreak}d</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>

                    {/* Longest Streak */}
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {stat.longestStreak > 0 ? `${stat.longestStreak}d` : '—'}
                    </td>

                    {/* Visual Progress Bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full tourera-progress-track rounded-full h-2.5 overflow-hidden p-0.5">
                          <div
                            className="tourera-liquid-fill h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(0, stat.completionRate))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300 shrink-0 w-9 text-right">
                          {Math.round(stat.completionRate)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
