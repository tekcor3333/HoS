import React from 'react';
import { RotateCcw, CheckSquare, ListTodo, Sparkles, X, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

export type ResetScope = 'habits-only' | 'tasks-only' | 'all';

interface ResetTicksModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthName: string;
  year: number;
  habitChecksCount: number;
  completedTasksCount: number;
  onConfirmReset: (scope: ResetScope) => void;
  initialScope?: ResetScope;
}

export const ResetTicksModal: React.FC<ResetTicksModalProps> = ({
  isOpen,
  onClose,
  monthName,
  year,
  habitChecksCount,
  completedTasksCount,
  onConfirmReset,
  initialScope = 'habits-only',
}) => {
  const [selectedScope, setSelectedScope] = React.useState<ResetScope>(initialScope);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedScope(initialScope);
    }
  }, [isOpen, initialScope]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmReset(selectedScope);
    onClose();
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-ticks-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl p-5 sm:p-6 tourera-glass-card border border-white/80 dark:border-white/15 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Liquid Specular Glint */}
        <div className="absolute top-0 inset-x-6 h-1 rounded-full bg-gradient-to-r from-transparent via-white/80 dark:via-white/50 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="reset-ticks-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Reset Ticks · {monthName} {year}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clear all checkmarks without removing your habits or task list
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Alert Note */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>
            You don't need to uncheck ticks one by one. Choose what to clear below:
          </span>
        </div>

        {/* Scope Options */}
        <div className="space-y-2.5 mb-5">
          {/* Option 1: Habits Grid Ticks Only */}
          <button
            type="button"
            onClick={() => setSelectedScope('habits-only')}
            className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              selectedScope === 'habits-only'
                ? 'bg-white dark:bg-white/15 border-slate-900 dark:border-white shadow-sm ring-1 ring-slate-900/10 dark:ring-white/20'
                : 'bg-white/50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedScope === 'habits-only'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Clear Habit Grid Ticks
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Unchecks all {habitChecksCount} habit ticks across the monthly grid
                </div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedScope === 'habits-only'
                  ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white'
                  : 'border-slate-400 dark:border-white/40'
              }`}
            >
              {selectedScope === 'habits-only' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
              )}
            </div>
          </button>

          {/* Option 2: Daily Task Ticks Only */}
          <button
            type="button"
            onClick={() => setSelectedScope('tasks-only')}
            className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              selectedScope === 'tasks-only'
                ? 'bg-white dark:bg-white/15 border-slate-900 dark:border-white shadow-sm ring-1 ring-slate-900/10 dark:ring-white/20'
                : 'bg-white/50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedScope === 'tasks-only'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <ListTodo className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Clear Daily Task Ticks
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Unchecks all {completedTasksCount} daily tasks across {monthName}
                </div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedScope === 'tasks-only'
                  ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white'
                  : 'border-slate-400 dark:border-white/40'
              }`}
            >
              {selectedScope === 'tasks-only' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
              )}
            </div>
          </button>

          {/* Option 3: Clear Both Habit & Task Ticks */}
          <button
            type="button"
            onClick={() => setSelectedScope('all')}
            className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              selectedScope === 'all'
                ? 'bg-white dark:bg-white/15 border-slate-900 dark:border-white shadow-sm ring-1 ring-slate-900/10 dark:ring-white/20'
                : 'bg-white/50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedScope === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Reset Everything for {monthName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Unchecks both grid habits and all daily tasks ({habitChecksCount + completedTasksCount} total ticks)
                </div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedScope === 'all'
                  ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white'
                  : 'border-slate-400 dark:border-white/40'
              }`}
            >
              {selectedScope === 'all' && (
                <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
              )}
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-950 hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Confirm Reset</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
