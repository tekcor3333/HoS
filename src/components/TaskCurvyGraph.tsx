import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DailyTodoTask } from '../types';
import { getDayOfWeek } from '../utils/dateUtils';
import { formatDateKey } from '../utils/dailyTodoStorage';
import { Sparkles, TrendingUp, CheckCircle2, Flame, Award } from 'lucide-react';

interface TaskCurvyGraphProps {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  activeWeekDays: number[];
  activeWeekLabel: string;
  dailyTodos: Record<string, DailyTodoTask[]>;
  todayDate: Date;
  onSelectDay?: (day: number) => void;
}

interface CurvyPoint {
  x: number;
  y: number;
  day: number;
  dateKey: string;
  dayName: string;
  fullDayName: string;
  total: number;
  completed: number;
  percent: number;
  isToday: boolean;
  tasks: DailyTodoTask[];
}

/**
 * Computes a continuous smooth cubic Bézier spline (Catmull-Rom to Cubic Bézier)
 * that produces organic, circular-curved waves without any sharp angles or straight line segments.
 */
function generateCurvySplinePath(points: CurvyPoint[], tension: number = 0.35): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  if (points.length === 2) {
    const midX = (points[0].x + points[1].x) / 2;
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} Q ${midX.toFixed(2)},${points[0].y.toFixed(2)} ${midX.toFixed(2)},${((points[0].y + points[1].y) / 2).toFixed(2)} T ${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * (1 + tension);
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * (1 + tension);

    const cp2x = p2.x - ((p3.x - p1.x) / 6) * (1 + tension);
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * (1 + tension);

    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return path;
}

/**
 * Closes the curvy spline into an area shape for the luminous gradient fill underneath.
 */
function generateCurvyAreaPath(points: CurvyPoint[], baselineY: number, tension: number = 0.35): string {
  if (points.length === 0) return '';
  const spline = generateCurvySplinePath(points, tension);
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x.toFixed(2)},${baselineY.toFixed(2)} L ${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

export const TaskCurvyGraph: React.FC<TaskCurvyGraphProps> = ({
  year,
  month,
  monthName,
  daysInMonth,
  activeWeekDays,
  activeWeekLabel,
  dailyTodos,
  todayDate,
  onSelectDay,
}) => {
  const [viewScope, setViewScope] = useState<'week' | 'month'>('month');
  const [hoveredPoint, setHoveredPoint] = useState<CurvyPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  // ResizeObserver to dynamically measure container width so SVG viewBox matches 1:1 with zero letterboxing
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  // Days list according to viewScope
  const targetDays = useMemo(() => {
    if (viewScope === 'week') {
      return activeWeekDays.length > 0
        ? activeWeekDays
        : Array.from({ length: Math.min(7, daysInMonth) }, (_, i) => i + 1);
    }
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [viewScope, activeWeekDays, daysInMonth]);

  // Dimensions for SVG canvas - dynamically match measured width
  const svgWidth = Math.max(320, containerWidth);
  const svgHeight = 210;
  const padTop = 24;
  const padBottom = 28;

  const usableHeight = svgHeight - padTop - padBottom;
  const baselineY = svgHeight - padBottom;

  // Process data points and map to curvy coordinates
  // Each day occupies colWidth = svgWidth / targetDays.length
  // Center of each day's column is (idx + 0.5) * colWidth, aligning 1:1 with the bottom pills
  const points: CurvyPoint[] = useMemo(() => {
    if (targetDays.length === 0) return [];
    const count = targetDays.length;
    const colWidth = svgWidth / count;

    return targetDays.map((day, idx) => {
      const dateKey = formatDateKey(year, month, day);
      const tasks = dailyTodos[dateKey] || [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const { shortName: dayName, fullName } = getDayOfWeek(year, month, day);

      const x = (idx + 0.5) * colWidth;
      const effectivePercent = percent;
      const y = baselineY - (effectivePercent / 100) * usableHeight;

      return {
        x,
        y,
        day,
        dateKey,
        dayName,
        fullDayName: fullName,
        total,
        completed,
        percent,
        isToday: day === todayDay,
        tasks,
      };
    });
  }, [targetDays, year, month, dailyTodos, todayDay, usableHeight, baselineY, svgWidth]);

  // Overall task metrics for current scope
  const summaryMetrics = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let daysWithFullCompletion = 0;
    let maxTasksDay: { day: number; count: number } = { day: 1, count: 0 };

    points.forEach((pt) => {
      totalTasks += pt.total;
      completedTasks += pt.completed;
      if (pt.total > 0 && pt.completed === pt.total) {
        daysWithFullCompletion++;
      }
      if (pt.completed > maxTasksDay.count) {
        maxTasksDay = { day: pt.day, count: pt.completed };
      }
    });

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      completionRate,
      daysWithFullCompletion,
      maxTasksDay,
    };
  }, [points]);

  // Secondary soft ambient wave points (smoothed circular rolling wave)
  const ambientPoints: CurvyPoint[] = useMemo(() => {
    if (points.length < 2) return [];
    return points.map((pt, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const smoothedY = (prev.y + pt.y * 2 + next.y) / 4;
      return {
        ...pt,
        y: Math.min(baselineY, smoothedY + 10), // slight harmonic offset
      };
    });
  }, [points, baselineY]);

  // Extended path points stretching from extreme left edge (x: 0) to extreme right edge (x: svgWidth)
  const pathPoints = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) return points;
    const first = points[0];
    const last = points[points.length - 1];
    return [
      { ...first, x: 0 },
      ...points,
      { ...last, x: svgWidth },
    ];
  }, [points, svgWidth]);

  const ambientPathPoints = useMemo(() => {
    if (ambientPoints.length === 0) return [];
    if (ambientPoints.length === 1) return ambientPoints;
    const first = ambientPoints[0];
    const last = ambientPoints[ambientPoints.length - 1];
    return [
      { ...first, x: 0 },
      ...ambientPoints,
      { ...last, x: svgWidth },
    ];
  }, [ambientPoints, svgWidth]);

  // Compute curved paths stretching from edge to edge
  const mainSplinePath = useMemo(() => generateCurvySplinePath(pathPoints, 0.35), [pathPoints]);
  const mainAreaPath = useMemo(() => generateCurvyAreaPath(pathPoints, baselineY, 0.35), [pathPoints, baselineY]);
  const ambientSplinePath = useMemo(() => generateCurvySplinePath(ambientPathPoints, 0.45), [ambientPathPoints]);

  // Circular Completion Ring Geometry (diameter 76px, radius 32px)
  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (summaryMetrics.completionRate / 100) * ringCircumference;

  // Curvy Circular Rhythm Arc Geometry (diameter 76px, 270-degree arc)
  const arcRadius = 32;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const activePercentClamped = Math.min(100, summaryMetrics.completionRate);
  const arcOffset = arcCircumference - (activePercentClamped / 100) * (arcCircumference * 0.75);

  return (
    <div className="tourera-glass-card rounded-3xl p-4 sm:p-6 border border-white/80 dark:border-white/10 shadow-lg mb-8 select-none relative overflow-hidden">
      {/* Background Soft Glow Aura */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/5 dark:bg-[#f6da7e]/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar with Scope Tabs & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-[#f6da7e] shrink-0 shadow-2xs">
            <TrendingUp className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Task Completion Wave & Circular Velocity
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:bg-[#f6da7e]/15 dark:text-[#f6da7e] border border-amber-500/20 dark:border-[#f6da7e]/30">
                <Sparkles className="w-3 h-3" /> Curvy Rhythm
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organic undulating curves mapping your daily checklist momentum across {viewScope === 'week' ? activeWeekLabel : `${monthName} (Day 1 to ${daysInMonth})`}
            </p>
          </div>
        </div>

        {/* View Scope Capsule Switcher (Full Month 1–last day vs Week Flow) */}
        <div className="flex items-center gap-1.5 self-start md:self-auto p-1 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewScope('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              viewScope === 'month'
                ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <span>Full Month</span>
            <span className="text-[10px] font-num font-bold px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-white/10">
              d1–d{daysInMonth}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewScope('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              viewScope === 'week'
                ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <span>This Week</span>
            <span className="text-[10px] font-num font-bold px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-white/10">
              7d
            </span>
          </button>
        </div>
      </div>

      {/* 2. Top Circular Stats Trio — Circular Completion Ring & Curvy Rhythm Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5 relative z-10">
        {/* Circular Gauge 1: Main Circular Completion Ring */}
        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:bg-white/80 dark:hover:bg-white/[0.08] transition-colors">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 76 76" className="w-16 h-16 -rotate-90 transform overflow-visible">
              <circle
                cx="38"
                cy="38"
                r={ringRadius}
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-slate-200/80 dark:text-white/10"
              />
              <circle
                cx="38"
                cy="38"
                r={ringRadius}
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-slate-900 dark:text-[#f6da7e] transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-extrabold text-slate-950 dark:text-white font-num leading-none">
                {summaryMetrics.completionRate}%
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Completion Velocity
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate font-num">
              {summaryMetrics.completedTasks} of {summaryMetrics.totalTasks} Done
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-num font-medium mt-0.5 block truncate">
              {summaryMetrics.totalTasks - summaryMetrics.completedTasks} tasks pending
            </span>
          </div>
        </div>

        {/* Circular Gauge 2: Circular Consistency Arc */}
        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:bg-white/80 dark:hover:bg-white/[0.08] transition-colors">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 76 76" className="w-16 h-16 -rotate-135 transform overflow-visible">
              <circle
                cx="38"
                cy="38"
                r={arcRadius}
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcCircumference * 0.25}
                strokeLinecap="round"
                fill="transparent"
                className="text-slate-200/80 dark:text-white/10"
              />
              <circle
                cx="38"
                cy="38"
                r={arcRadius}
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcOffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-amber-500 dark:text-[#f6da7e] transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Flame className="w-4 h-4 text-amber-500 dark:text-[#f6da7e]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Peak Momentum
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
              Day <span className="font-num">{summaryMetrics.maxTasksDay.day}</span> Leader
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-num font-medium mt-0.5 block truncate">
              {summaryMetrics.maxTasksDay.count} tasks completed in 1 day
            </span>
          </div>
        </div>

        {/* Circular Gauge 3: Days with 100% Completion Badge */}
        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:bg-white/80 dark:hover:bg-white/[0.08] transition-colors">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 border-2 border-emerald-500/30 dark:border-emerald-400/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0 shadow-2xs">
            <Award className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Flawless Days
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
              <span className="font-num">{summaryMetrics.daysWithFullCompletion}</span> Days All-Done
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-num font-medium mt-0.5 block truncate">
              100% checklist cleared
            </span>
          </div>
        </div>
      </div>

      {/* 3. The Curvy Circular SVG Wave Canvas */}
      <div className="w-full bg-white/80 dark:bg-slate-950/70 rounded-2xl p-3 sm:p-4 border border-white dark:border-white/10 shadow-inner relative overflow-hidden">
        <div ref={containerRef} className="w-full relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-44 sm:h-52 overflow-visible relative z-10 touch-pan-x block"
          >
            <defs>
              {/* Curvy Fluid Gradient Area Fill */}
              <linearGradient id="taskCurvyGlowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
                <stop offset="65%" stopColor="currentColor" stopOpacity="0.08" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
              </linearGradient>

              {/* Ambient Secondary Wave Fill */}
              <linearGradient id="taskAmbientWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
              </linearGradient>

              {/* Glowing Drop Filter for the main curvy line */}
              <filter id="curvyGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid lines and percentage markers placed mathematically inside SVG */}
            {[
              { label: '100%', y: padTop },
              { label: '75%', y: padTop + usableHeight * 0.25 },
              { label: '50%', y: padTop + usableHeight * 0.5 },
              { label: '25%', y: padTop + usableHeight * 0.75 },
              { label: '0%', y: baselineY },
            ].map((grid) => (
              <g key={grid.label} className="pointer-events-none opacity-25 dark:opacity-30">
                <line
                  x1={0}
                  y1={grid.y}
                  x2={Math.max(0, svgWidth - 38)}
                  y2={grid.y}
                  stroke="currentColor"
                  strokeDasharray={grid.label === '0%' ? undefined : '4 4'}
                  strokeWidth={grid.label === '0%' ? 1.5 : 1}
                  className="text-slate-500 dark:text-slate-400"
                />
                <text
                  x={svgWidth - 4}
                  y={grid.y + 3}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[9px] font-num font-bold text-slate-500 dark:text-slate-400 select-none"
                >
                  {grid.label}
                </text>
              </g>
            ))}

            {/* 1. Underlying Ambient Wave (Soft Fluid Motion Rhythm) */}
            {ambientSplinePath && (
              <path
                d={ambientSplinePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="text-slate-400/40 dark:text-[#f6da7e]/30 transition-all duration-500"
              />
            )}

            {/* 2. Main Curvy Spline Gradient Area */}
            {mainAreaPath && (
              <path
                d={mainAreaPath}
                fill="url(#taskCurvyGlowFill)"
                className="text-slate-900 dark:text-[#f6da7e] transition-all duration-500 ease-out"
              />
            )}

            {/* 3. Main Organic Curvy Spline Line */}
            {mainSplinePath && (
              <path
                d={mainSplinePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#curvyGlow)"
                className="text-slate-950 dark:text-[#f6da7e] transition-all duration-500 ease-out"
              />
            )}

            {/* 4. Circular Interactive Nodes along the curve */}
            {points.map((pt) => {
              const isHovered = hoveredPoint?.day === pt.day;
              const isFlawless = pt.total > 0 && pt.completed === pt.total;

              return (
                <g
                  key={pt.day}
                  className="cursor-pointer transition-transform duration-200"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => onSelectDay && onSelectDay(pt.day)}
                >
                  {/* Outer Glow Halo for Today or Hover */}
                  {(pt.isToday || isHovered) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.isToday ? 15 : 12}
                      fill="currentColor"
                      fillOpacity="0.18"
                      className="text-slate-900 dark:text-[#f6da7e] transition-all animate-pulse"
                    />
                  )}

                  {/* Animated Pulsing Ping for Today */}
                  {pt.isToday && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={9}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-slate-900 dark:text-[#f6da7e] animate-ping opacity-60"
                    />
                  )}

                  {/* Outer Circular Ring Bead */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6.5 : pt.isToday ? 5.5 : 4.5}
                    stroke="currentColor"
                    strokeWidth={isHovered ? 2.5 : 2}
                    className={`transition-all duration-200 ${
                      isFlawless
                        ? 'fill-emerald-500 stroke-white dark:stroke-slate-950'
                        : pt.isToday
                        ? 'fill-slate-950 dark:fill-[#f6da7e] stroke-white dark:stroke-slate-950'
                        : pt.percent > 0
                        ? 'fill-slate-800 dark:fill-[#ecd06c] stroke-white dark:stroke-slate-900'
                        : 'fill-slate-300 dark:fill-white/30 stroke-white dark:stroke-slate-900'
                    }`}
                  />

                  {/* Inner Pinpoint for high precision */}
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={2}
                      fill="white"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* 4. Interactive Floating Tooltip on Node Hover */}
          {hoveredPoint && (
            <div
              className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150"
              style={{
                left: `${Math.min(92, Math.max(8, (hoveredPoint.x / svgWidth) * 100))}%`,
                top: `${Math.max(8, (hoveredPoint.y / svgHeight) * 100 - 8)}%`,
              }}
            >
              <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-950 p-2.5 rounded-2xl shadow-2xl border border-white/20 dark:border-black/20 text-xs min-w-[150px] backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 border-b border-white/15 dark:border-black/15 pb-1.5 mb-1.5">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">
                    {hoveredPoint.dayName} {hoveredPoint.day} {monthName.slice(0, 3)}
                  </span>
                  <span className="font-num font-extrabold text-amber-300 dark:text-amber-700">
                    {hoveredPoint.percent}%
                  </span>
                </div>
                <div className="text-[11px] font-medium flex items-center justify-between">
                  <span>Completed:</span>
                  <strong className="font-num font-bold">{hoveredPoint.completed} of {hoveredPoint.total}</strong>
                </div>
                {hoveredPoint.tasks.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 dark:border-black/10 text-[10px] space-y-0.5 opacity-90 max-w-[180px]">
                    {hoveredPoint.tasks.slice(0, 2).map((t) => (
                      <div key={t.id} className="truncate flex items-center gap-1">
                        <span className={t.completed ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400'}>
                          {t.completed ? '✓' : '○'}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {hoveredPoint.tasks.length > 2 && (
                      <div className="text-[9px] opacity-70 italic font-num">
                        +{hoveredPoint.tasks.length - 2} more tasks
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Bottom Circular Day Pills Strip */}
          <div className="flex justify-between items-center px-0 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[10px] font-num font-bold text-slate-500 dark:text-slate-400 w-full">
            {points.map((pt, idx) => {
              const showLabel =
                viewScope === 'week' ||
                idx === 0 ||
                idx === points.length - 1 ||
                pt.day % 5 === 0 ||
                pt.isToday;

              return (
                <button
                  key={pt.day}
                  type="button"
                  onClick={() => onSelectDay && onSelectDay(pt.day)}
                  className={`flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                    pt.isToday
                      ? 'text-slate-950 dark:text-[#f6da7e] font-black'
                      : hoveredPoint?.day === pt.day
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                  style={{ width: `${100 / points.length}%` }}
                >
                  {showLabel ? (
                    <>
                      <span className="text-[9px] uppercase leading-tight font-sans">
                        {pt.dayName}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-md ${
                          pt.day === 1 || pt.day === daysInMonth
                            ? 'bg-slate-900/10 dark:bg-white/15 text-slate-950 dark:text-white font-black ring-1 ring-slate-900/20 dark:ring-white/20'
                            : pt.isToday
                            ? 'bg-slate-900 text-white dark:bg-[#f6da7e] dark:text-slate-950 font-black'
                            : ''
                        }`}
                      >
                        {pt.day}
                      </span>
                    </>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20 my-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
