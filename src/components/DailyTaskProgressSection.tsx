import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DailyStat, DailyTodoTask } from '../types';
import { getDaysInMonth, getDayOfWeek, getWeekGroups } from '../utils/dateUtils';
import {
  formatDateKey,
  loadDailyTodos,
  saveDailyTodos,
} from '../utils/dailyTodoStorage';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Plus,
  ListTodo,
  Flame,
  CheckCircle2,
  Trash2,
  Edit2,
  Copy,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyTaskProgressSectionProps {
  checks?: Record<string, boolean>;
  dailyStats?: DailyStat[];
  year: number;
  month: number;
  monthName: string;
  todayDate: Date;
  standaloneView?: boolean;
  onAddHabit?: () => void;
  // Optional for backward compatibility with existing parent callers
  habits?: unknown[];
  onToggleCheck?: (habitId: string, day: number) => void;
}

export const DailyTaskProgressSection: React.FC<DailyTaskProgressSectionProps> = ({
  year,
  month,
  monthName,
  todayDate,
  standaloneView = false,
  onAddHabit,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const weekGroups = useMemo(() => getWeekGroups(daysInMonth), [daysInMonth]);

  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  // Independent Daily Todos Collection stored by exact YYYY-MM-DD
  const [dailyTodos, setDailyTodos] = useState<Record<string, DailyTodoTask[]>>(() =>
    loadDailyTodos()
  );

  // Add Task inline form state (per date)
  const [addingTaskForDate, setAddingTaskForDate] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Edit Task inline form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Copy modal/dropdown state
  const [copyingFromDate, setCopyingFromDate] = useState<string | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState<string>('');

  // Initial week based on current day or Week 1
  const initialWeek = useMemo(() => {
    if (todayDay > 0) {
      const match = weekGroups.find((g) => g.days.includes(todayDay));
      if (match) return match.weekNumber;
    }
    return 1;
  }, [todayDay, weekGroups]);

  const [activeWeekNumber, setActiveWeekNumber] = useState<number>(initialWeek);

  // Liquid slider tracking & animation state (matching MonthlyOverview.tsx)
  const weekTrackRef = useRef<HTMLDivElement>(null);
  const weekButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillGeometry, setPillGeometry] = useState<{ left: number; width: number }>({ left: 34, width: 68 });
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [dragHoverWeek, setDragHoverWeek] = useState<number | null>(null);
  const [dragPillLeft, setDragPillLeft] = useState<number | null>(null);

  const activeDisplayWeek = dragHoverWeek ?? activeWeekNumber;
  const activeWeekIndex = activeDisplayWeek - 1;

  // Measure and align the liquid water bar to the active week button
  const updatePillToWeek = useCallback((targetWeek: number) => {
    const idx = targetWeek - 1;
    const btn = weekButtonRefs.current[idx];
    const track = weekTrackRef.current;
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
      updatePillToWeek(activeWeekNumber);
    }
  }, [activeWeekNumber, isSliding, updatePillToWeek]);

  useEffect(() => {
    const handleResize = () => {
      if (!isSliding) {
        updatePillToWeek(activeWeekNumber);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeWeekNumber, isSliding, updatePillToWeek]);

  // Determine closest week from client X coordinate during drag
  const getWeekFromPointerX = useCallback((clientX: number) => {
    const track = weekTrackRef.current;
    if (!track) return activeWeekNumber;
    const trackRect = track.getBoundingClientRect();
    const relativeX = clientX - trackRect.left;

    let closestWeek = 1;
    let minDistance = Infinity;

    weekButtonRefs.current.forEach((btn, idx) => {
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const btnCenterX = btnRect.left - trackRect.left + btnRect.width / 2;
        const dist = Math.abs(relativeX - btnCenterX);
        if (dist < minDistance) {
          minDistance = dist;
          closestWeek = idx + 1;
        }
      }
    });

    return closestWeek;
  }, [activeWeekNumber]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsSliding(true);

    const track = weekTrackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const relativeX = e.clientX - trackRect.left;
      const targetWeek = getWeekFromPointerX(e.clientX);
      setDragHoverWeek(targetWeek);
      setDragPillLeft(Math.max(6, Math.min(trackRect.width - pillGeometry.width - 6, relativeX - pillGeometry.width / 2)));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    const track = weekTrackRef.current;
    if (track) {
      const trackRect = track.getBoundingClientRect();
      const relativeX = e.clientX - trackRect.left;
      const targetWeek = getWeekFromPointerX(e.clientX);
      setDragHoverWeek(targetWeek);
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

    const finalWeek = dragHoverWeek ?? getWeekFromPointerX(e.clientX);
    setIsSliding(false);
    setDragPillLeft(null);
    setDragHoverWeek(null);

    setActiveWeekNumber(finalWeek);
  };

  // Active days to display for this week
  const activeWeek =
    weekGroups.find((g) => g.weekNumber === activeWeekNumber) || weekGroups[0];
  const displayedDays = activeWeek ? activeWeek.days : [];

  // Helper to update daily todos with persistence
  const updateDailyTodos = (
    updater: (prev: Record<string, DailyTodoTask[]>) => Record<string, DailyTodoTask[]>
  ) => {
    setDailyTodos((prev) => {
      const next = updater(prev);
      saveDailyTodos(next);
      return next;
    });
  };

  // Add task to a specific date only
  const handleSaveNewTask = (dateKey: string) => {
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) return;

    const newTask: DailyTodoTask = {
      id: `todo-${dateKey}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: dateKey,
      title: trimmedTitle,
      description: newTaskDesc.trim() || undefined,
      priority: newTaskPriority,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    updateDailyTodos((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newTask],
    }));

    setAddingTaskForDate(null);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('medium');
  };

  // Start editing a task
  const handleStartEdit = (dateKey: string, task: DailyTodoTask) => {
    setEditingDateKey(dateKey);
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority || 'medium');
  };

  // Save task edit (updates only that date's task)
  const handleSaveEdit = (dateKey: string, taskId: string) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;

    updateDailyTodos((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: trimmedTitle,
              description: editDesc.trim() || undefined,
              priority: editPriority,
            }
          : t
      ),
    }));

    setEditingTaskId(null);
    setEditingDateKey(null);
  };

  // Delete task from a specific date only
  const handleDeleteTask = (dateKey: string, taskId: string) => {
    updateDailyTodos((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((t) => t.id !== taskId),
    }));

    if (editingTaskId === taskId) {
      setEditingTaskId(null);
      setEditingDateKey(null);
    }
  };

  // Toggle check/uncheck for a specific date's task
  const handleToggleTask = (dateKey: string, taskId: string) => {
    let triggeredConfetti = false;

    updateDailyTodos((prev) => {
      const currentList = prev[dateKey] || [];
      const target = currentList.find((t) => t.id === taskId);
      if (!target) return prev;

      const nextCompleted = !target.completed;
      const updatedList = currentList.map((t) =>
        t.id === taskId ? { ...t, completed: nextCompleted } : t
      );

      // Trigger celebration if all tasks on this date are now completed
      if (
        nextCompleted &&
        updatedList.length > 0 &&
        updatedList.every((t) => t.completed)
      ) {
        triggeredConfetti = true;
      }

      return {
        ...prev,
        [dateKey]: updatedList,
      };
    });

    if (triggeredConfetti) {
      try {
        confetti({
          particleCount: 75,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#cbd5e1'],
        });
      } catch {
        // ignore
      }
    }
  };

  // Copy tasks from one date to an explicitly chosen target date only
  const handleConfirmCopy = (sourceDateKey: string) => {
    if (!copyTargetDate || copyTargetDate === sourceDateKey) {
      setCopyingFromDate(null);
      return;
    }

    const sourceTasks = dailyTodos[sourceDateKey] || [];
    if (sourceTasks.length === 0) {
      setCopyingFromDate(null);
      return;
    }

    const clonedTasks: DailyTodoTask[] = sourceTasks.map((t) => ({
      ...t,
      id: `todo-${copyTargetDate}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: copyTargetDate,
      completed: false, // reset completion state on copied target
      createdAt: new Date().toISOString(),
    }));

    updateDailyTodos((prev) => ({
      ...prev,
      [copyTargetDate]: [...(prev[copyTargetDate] || []), ...clonedTasks],
    }));

    setCopyingFromDate(null);
    setCopyTargetDate('');
  };

  // Circular progress ring dimensions
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;

  // Today's exact dateKey (e.g. 2026-11-02)
  const todayDateKey =
    todayDay > 0 ? formatDateKey(year, month, todayDay) : null;

  // Today's summary stats
  const todayStats = useMemo(() => {
    if (!todayDateKey) return { completed: 0, total: 0, percent: 0 };
    const tasks = dailyTodos[todayDateKey] || [];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }, [todayDateKey, dailyTodos]);

  // Week summary stats across the active week
  const weekStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;

    displayedDays.forEach((day) => {
      const dKey = formatDateKey(year, month, day);
      const list = dailyTodos[dKey] || [];
      totalTasks += list.length;
      completedTasks += list.filter((t) => t.completed).length;
    });

    const percent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      percent,
    };
  }, [displayedDays, year, month, dailyTodos]);

  return (
    <section
      id="daily-task-progress-section"
      className={standaloneView ? 'mb-8' : 'mt-8 mb-6'}
    >
      {/* Standalone View Hero / Metric Bar */}
      {standaloneView && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <div className="tourera-glass-card rounded-3xl p-4.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Today's Daily Tasks
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {todayStats.percent}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {todayStats.completed} of {todayStats.total} tasks completed today
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="tourera-glass-card rounded-3xl p-4.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Weekly Checklist Total
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {weekStats.totalTasks}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Independent tasks scheduled in {activeWeek.label}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>

          <div className="tourera-glass-card rounded-3xl p-4.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Weekly Velocity
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {weekStats.percent}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {weekStats.completedTasks} / {weekStats.totalTasks} done across this week
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Section Header with Title & Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white inline-block" />
              <span>
                {standaloneView ? 'Task Bar & Daily Tasks' : 'Daily Tasks & Progress'}
              </span>
            </h2>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 shadow-2xs">
              {monthName} {year} · {activeWeek.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Every day has its own independent Todo list, dynamic progress ring, and task bar
          </p>
        </div>

        {/* Action Buttons & Week Switcher Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onAddHabit && (
            <button
              type="button"
              onClick={onAddHabit}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 shadow-2xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
              <span>Add Global Habit</span>
            </button>
          )}

          {/* Symmetrically Aligned Week Switcher Bar with Liquid Moving Water Capsule (matching Overview) */}
          <div
            ref={weekTrackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="tourera-glass-card no-hover-lift hover:!transform-none hover:!translate-y-0 p-1 rounded-full relative flex items-center border border-white/80 dark:border-white/15 shadow-sm select-none cursor-pointer group gap-0.5"
            title="Slide to browse and switch weeks"
          >
            {/* Draggable Liquid Moving Water Bar */}
            <div
              className={`liquid-water-bar absolute top-1 bottom-1 rounded-full pointer-events-none z-0 ${
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

            {/* Previous Week arrow */}
            <button
              type="button"
              disabled={activeWeekNumber <= 1}
              onClick={(e) => {
                e.stopPropagation();
                setActiveWeekNumber((prev) => Math.max(1, prev - 1));
              }}
              className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/80 dark:hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
              title="Previous Week"
              aria-label="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Week Pills with Professional Divider Lines */}
            {weekGroups.map((g, index) => {
              const isSelected = g.weekNumber === activeDisplayWeek;
              const isNearActive = index === activeWeekIndex || index === activeWeekIndex + 1;

              return (
                <React.Fragment key={g.weekNumber}>
                  {index > 0 && (
                    <div
                      className="w-px h-3.5 bg-slate-400/30 dark:bg-white/15 shrink-0 pointer-events-none transition-opacity duration-200"
                      style={{ opacity: isNearActive ? 0 : 1 }}
                    />
                  )}

                  <button
                    ref={(el) => {
                      weekButtonRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => {
                      if (!isSliding) {
                        setActiveWeekNumber(g.weekNumber);
                      }
                    }}
                    className={`py-1.5 px-3 sm:px-3.5 rounded-full text-center relative z-10 transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'text-slate-950 dark:text-white font-extrabold scale-105'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold'
                    }`}
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span>{g.label}</span>
                  </button>
                </React.Fragment>
              );
            })}

            {/* Next Week arrow */}
            <button
              type="button"
              disabled={activeWeekNumber >= weekGroups.length}
              onClick={(e) => {
                e.stopPropagation();
                setActiveWeekNumber((prev) => Math.min(weekGroups.length, prev + 1));
              }}
              className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/80 dark:hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
              title="Next Week"
              aria-label="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to Today Button */}
          {todayDay > 0 && (
            <button
              type="button"
              onClick={() => {
                const match = weekGroups.find((g) => g.days.includes(todayDay));
                if (match) setActiveWeekNumber(match.weekNumber);
              }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-white/80 dark:border-white/15 backdrop-blur-md shadow-2xs transition-all flex items-center gap-1 shrink-0"
            >
              <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-300" />
              <span>Today</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Horizontal Daily Cards Row */}
      {/* On desktop: clean 7-column horizontal layout; On mobile/tablet: smooth horizontal scroll */}
      <div className="w-full overflow-x-auto scrollbar-thin pb-3 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="flex lg:grid lg:grid-cols-7 gap-3.5 min-w-max lg:min-w-0">
          {displayedDays.map((day) => {
            const dateKey = formatDateKey(year, month, day);
            const { fullName: dayName } = getDayOfWeek(year, month, day);
            const formattedDate = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
            const isToday = day === todayDay;

            // Date-specific tasks list
            const tasks = dailyTodos[dateKey] || [];
            const totalTasks = tasks.length;
            const completedCount = tasks.filter((t) => t.completed).length;

            // Formula: completedTasksForThatDate / totalTasksForThatDate * 100
            // If 0 tasks: 0%, never NaN, never Infinity
            const percentage =
              totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            const isAllCompleted = totalTasks > 0 && completedCount === totalTasks;

            const strokeDashoffset =
              ringCircumference - (percentage / 100) * ringCircumference;

            const isAddingThisDay = addingTaskForDate === dateKey;
            const isCopyingThisDay = copyingFromDate === dateKey;

            return (
              <div
                key={dateKey}
                className={`tourera-glass-card rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 w-[220px] sm:w-[235px] lg:w-auto shrink-0 lg:shrink ${
                  isToday
                    ? 'ring-2 ring-slate-900/60 dark:ring-0 dark:littlebird-active-tile bg-white/85 shadow-lg relative'
                    : percentage > 0
                    ? 'bg-white/70 dark:bg-[#161820]/90 border border-slate-200/80 dark:border-[#f6da7e]/40 dark:shadow-[0_0_18px_rgba(246,218,126,0.14)]'
                    : 'bg-white/50 dark:bg-[#12141a]/80 hover:bg-white/70 dark:hover:bg-[#181a22]/90 border border-slate-200/50 dark:border-white/[0.08]'
                }`}
              >
                {/* 1. DAY NAME & DATE HEADER */}
                <div className="pb-3 border-b border-slate-200/70 dark:border-white/10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {dayName}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                      {formattedDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Copy to Date Button */}
                    <button
                      type="button"
                      title={`Copy ${dayName}'s tasks to another date`}
                      onClick={() => {
                        setCopyingFromDate(isCopyingThisDay ? null : dateKey);
                        setCopyTargetDate('');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {isAllCompleted && (
                      <div
                        title="100% Tasks Completed"
                        className="w-5 h-5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Copy Selector Tooltip/Bar */}
                {isCopyingThisDay && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 text-xs shadow-lg space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-100">
                      <span>Copy {tasks.length} tasks to:</span>
                      <button
                        type="button"
                        onClick={() => setCopyingFromDate(null)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <select
                      value={copyTargetDate}
                      onChange={(e) => setCopyTargetDate(e.target.value)}
                      className="w-full text-[11px] p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="">Select target day...</option>
                      {displayedDays
                        .filter((d) => formatDateKey(year, month, d) !== dateKey)
                        .map((d) => {
                          const targetKey = formatDateKey(year, month, d);
                          const { fullName: tName } = getDayOfWeek(year, month, d);
                          return (
                            <option key={targetKey} value={targetKey}>
                              {tName} ({String(d).padStart(2, '0')}.{String(month).padStart(2, '0')})
                            </option>
                          );
                        })}
                    </select>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={!copyTargetDate}
                        onClick={() => handleConfirmCopy(dateKey)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40"
                      >
                        Confirm Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. CIRCULAR PROGRESS RING */}
                <div className="py-4 flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <svg
                      viewBox="0 0 60 60"
                      className="w-20 h-20 -rotate-90 transform overflow-visible"
                    >
                      {/* Background Ring Track */}
                      <circle
                        cx="30"
                        cy="30"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="3.5"
                        fill="transparent"
                        className="text-slate-200/80 dark:text-white/10"
                      />
                      {/* Dynamic Animated Progress Stroke */}
                      <circle
                        cx="30"
                        cy="30"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="text-slate-900 dark:text-[#f6da7e] transition-all duration-500 ease-out"
                      />
                    </svg>

                    {/* Centered Percentage Value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-300 mt-1">
                    {totalTasks > 0
                      ? `${completedCount} of ${totalTasks} done`
                      : 'No tasks yet'}
                  </span>
                </div>

                {/* 3. TASK PROGRESS BAR / SUMMARY AREA */}
                <div className="py-2.5 px-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                      Tasks
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums text-[11px]">
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-black/60 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-slate-900 dark:bg-gradient-to-r dark:from-[#f6da7e] dark:to-[#fff0b5] dark:shadow-[0_0_8px_rgba(246,218,126,0.7)] transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* 4. TASK LIST (INDEPENDENT CHECKLIST FOR THIS DATE) */}
                <div className="flex-1 mb-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    <span>{dayName}'s Tasks</span>
                    <span className="font-mono">
                      {completedCount}/{totalTasks}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {tasks.map((task) => {
                      const isEditing =
                        editingTaskId === task.id && editingDateKey === dateKey;

                      if (isEditing) {
                        return (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 shadow-sm space-y-2"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(dateKey, task.id);
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                              placeholder="Task title..."
                              className="w-full text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-hidden"
                            />
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <select
                                value={editPriority}
                                onChange={(e) =>
                                  setEditPriority(
                                    e.target.value as 'low' | 'medium' | 'high'
                                  )
                                }
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10"
                              >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(dateKey, task.id)}
                                  className="px-2 py-0.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl border transition-all select-none group ${
                            task.completed
                              ? 'bg-slate-900/5 dark:bg-white/10 border-slate-900/10 dark:border-white/15'
                              : 'bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border-white/70 dark:border-white/10'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleTask(dateKey, task.id)}
                            className="flex items-center gap-2 min-w-0 mr-1.5 flex-1 cursor-pointer"
                          >
                            {/* Checkbox (Unchecked ☐ / Completed ☑) */}
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                task.completed
                                  ? 'tourera-check-active scale-100'
                                  : 'tourera-check-empty group-hover:border-slate-400 dark:group-hover:border-white/40'
                              }`}
                            >
                              {task.completed && (
                                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                              )}
                            </div>

                            <div className="truncate">
                              <span
                                className={`text-[11px] font-medium truncate block ${
                                  task.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                              {task.priority === 'high' && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block -mt-0.5">
                                  High
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Task Hover Action Controls (Edit & Delete) */}
                          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(dateKey, task);
                              }}
                              title="Edit task"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(dateKey, task.id);
                              }}
                              title="Delete task"
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty Day State */}
                    {tasks.length === 0 && !isAddingThisDay && (
                      <div className="text-center py-4 px-2 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          No tasks yet
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingTaskForDate(dateKey);
                            setNewTaskTitle('');
                            setNewTaskDesc('');
                            setNewTaskPriority('medium');
                          }}
                          className="mt-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-900 dark:text-white bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-lg transition-colors border border-white/60 dark:border-white/10 cursor-pointer shadow-2xs"
                        >
                          + Add Task
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Add Task Form for this Specific Day */}
                  {isAddingThisDay && (
                    <div className="mt-2 p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-white/20 shadow-md space-y-2 animate-in fade-in zoom-in-95">
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Add to {dayName} ({formattedDate})
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewTask(dateKey);
                          if (e.key === 'Escape') setAddingTaskForDate(null);
                        }}
                        placeholder="Task title (e.g. Finish report)..."
                        className="w-full text-xs font-medium px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-hidden"
                      />
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <select
                          value={newTaskPriority}
                          onChange={(e) =>
                            setNewTaskPriority(
                              e.target.value as 'low' | 'medium' | 'high'
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAddingTaskForDate(null)}
                            className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!newTaskTitle.trim()}
                            onClick={() => handleSaveNewTask(dateKey)}
                            className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Task Trigger Button if not already adding and tasks exist */}
                  {!isAddingThisDay && tasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingTaskForDate(dateKey);
                        setNewTaskTitle('');
                        setNewTaskDesc('');
                        setNewTaskPriority('medium');
                      }}
                      className="mt-2 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/15 border border-dashed border-slate-300 dark:border-white/15 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>

                {/* 5. TASK COMPLETION STATUS FOOTER */}
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                    Status
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      isAllCompleted
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : percentage > 0
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isAllCompleted
                      ? 'Completed 🎉'
                      : totalTasks > 0
                      ? `${totalTasks - completedCount} remaining`
                      : 'No tasks'}
                  </span>
                </div>

                {/* 6. Signature Littlebird Luminous Bottom Pill Indicator */}
                {percentage > 0 && (
                  <div className="hidden dark:block pt-2 w-full">
                    <div className="littlebird-glow-pill w-full mx-auto" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Week Overview Summary Strip */}
      <div className="mt-3 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white">
            {activeWeek.label} Daily Tasks:
          </span>
          <span>
            {weekStats.completedTasks} of {weekStats.totalTasks} completed across these 7 days
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span>Completion Rate:</span>
            <strong className="text-slate-950 dark:text-white">
              {weekStats.percent}%
            </strong>
          </div>
          <div className="w-24 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
              style={{ width: `${weekStats.percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
