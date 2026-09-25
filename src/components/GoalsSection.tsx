import React, { useState } from 'react';
import { MonthlyGoals, MonthOverviewStats } from '../types';
import { Check, Edit3, Save } from 'lucide-react';

interface GoalsSectionProps {
  goals: MonthlyGoals;
  stats: MonthOverviewStats;
  onUpdateGoals: (updated: MonthlyGoals) => void;
  monthName: string;
  year: number;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  stats,
  onUpdateGoals,
  monthName,
  year,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<MonthlyGoals>(goals);

  const handleSave = () => {
    onUpdateGoals(formData);
    setIsEditing(false);
  };

  const isTargetAchieved = stats.overallPercentage >= goals.targetPercentage;

  return (
    <section id="goals" className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Goals · {monthName} {year}
          </h2>
        </div>

        <button
          onClick={() => {
            if (isEditing) {
              handleSave();
            } else {
              setFormData(goals);
              setIsEditing(true);
            }
          }}
          className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
            isEditing
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100'
              : 'bg-white dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Goals</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
              <span>Edit Goals</span>
            </>
          )}
        </button>
      </div>

      <div className="tourera-glass-card rounded-3xl p-6 border border-white/90 dark:border-white/10 shadow-md">
        {isEditing ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Main Goal
              </label>
              <input
                type="text"
                value={formData.mainGoal}
                onChange={(e) => setFormData({ ...formData, mainGoal: e.target.value })}
                placeholder="e.g. Build unbreakable morning routine & daily gym attendance"
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  Target Completion Rate (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.targetPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetPercentage: Number(e.target.value) || 75,
                    })
                  }
                  className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  Habit Target (Total Check-ins count)
                </label>
                <input
                  type="number"
                  min={1}
                  max={stats.totalPossibleCheckins || 300}
                  value={formData.habitTarget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      habitTarget: Number(e.target.value) || 200,
                    })
                  }
                  className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Core Motivation
              </label>
              <input
                type="text"
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="Why is this month crucial to your long-term vision?"
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                Monthly Notes & Systems
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Tactical rules (e.g. phone off by 10pm, gym bag prepped night before)..."
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-medium"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Top row: Main Goal & Real-time status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Primary Objective
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {goals.mainGoal || 'Set your primary monthly goal...'}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Completion Target</div>
                  <div className="text-base font-mono font-black text-slate-900 dark:text-white">
                    {stats.overallPercentage.toFixed(1)}% / {goals.targetPercentage}%
                  </div>
                </div>

                <div
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isTargetAchieved
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                      : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isTargetAchieved ? 'Target Met' : 'In Progress'}</span>
                </div>
              </div>
            </div>

            {/* Middle Grid: Metric comparison cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/70 dark:bg-white/5 rounded-2xl border border-white dark:border-white/10 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Target Check-ins
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                  {stats.totalCompletedCheckins}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    / {goals.habitTarget} target
                  </span>
                </div>
                <div className="w-full tourera-progress-track rounded-full h-2 mt-2.5 overflow-hidden p-0.5">
                  <div
                    className="tourera-liquid-fill h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((stats.totalCompletedCheckins / (goals.habitTarget || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-white/70 dark:bg-white/5 rounded-2xl border border-white dark:border-white/10 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Consistency Standard
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                  {goals.targetPercentage}% minimum
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {isTargetAchieved
                    ? 'Exceeding target benchmark'
                    : `${(goals.targetPercentage - stats.overallPercentage).toFixed(1)}% to reach target`}
                </div>
              </div>

              <div className="p-4 bg-white/70 dark:bg-white/5 rounded-2xl border border-white dark:border-white/10 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Motivation
                </span>
                <div className="text-xs italic font-medium text-slate-700 dark:text-slate-200 mt-1.5 line-clamp-2">
                  "{goals.motivation || 'Small daily actions produce exponential lifelong outcomes.'}"
                </div>
              </div>
            </div>

            {/* Bottom Row: Systems and Notes */}
            {goals.notes && (
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-white/5 p-4 rounded-2xl border border-white dark:border-white/10">
                <span className="font-bold text-slate-900 dark:text-white">Operational Notes: </span>
                {goals.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
