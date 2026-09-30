import React, { useState, useEffect } from 'react';
import { Habit } from '../types';
import { X, Check } from 'lucide-react';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  habitToEdit?: Habit | null;
  daysInMonth: number;
}

const EMOJI_OPTIONS = [
  '⏰', '🏋️', '📖', '🎯', '💰', '🍷', '🌿', '📝', '🚿', '🌙',
  '🧘', '💧', '🍎', '💻', '🚴', '🏃', '🚶', '🎨', '📚', '🔋',
  '🥗', '☀️', '🦷', '🧹', '⚡', '☕', '🧠', '🎧', '🥑', '✨',
];

const PRESET_CATEGORIES = [
  'Morning Routine',
  'Health & Fitness',
  'Mind & Growth',
  'Productivity',
  'Finances',
  'Mindfulness',
  'Discipline',
  'Recovery',
  'Nutrition',
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  habitToEdit,
  daysInMonth,
}) => {
  const [name, setName] = useState<string>('');
  const [emoji, setEmoji] = useState<string>('🎯');
  const [category, setCategory] = useState<string>('Productivity');
  const [targetDays, setTargetDays] = useState<number>(daysInMonth);
  const [customCategory, setCustomCategory] = useState<string>('');

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setEmoji(habitToEdit.emoji);
      setCategory(habitToEdit.category);
      setTargetDays(habitToEdit.targetDays || daysInMonth);
    } else {
      setName('');
      setEmoji('🎯');
      setCategory('Productivity');
      setTargetDays(daysInMonth);
    }
  }, [habitToEdit, isOpen, daysInMonth]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory = customCategory.trim() ? customCategory.trim() : category;

    onSave({
      name: name.trim(),
      emoji,
      category: finalCategory,
      targetDays: Number(targetDays) || daysInMonth,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl max-w-md w-full p-6 relative border border-white dark:border-white/15">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Habit Name */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Habit Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 20 pages / Morning run"
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-medium"
            />
          </div>

          {/* Emoji Selection */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Icon / Emoji
            </label>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/20 rounded-2xl">
                {emoji}
              </span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                Choose an icon representing this habit
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-white/15 max-h-28 overflow-y-auto scrollbar-thin">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`text-lg p-1 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer text-center ${
                    emoji === em ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs scale-105' : ''
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setCustomCategory('');
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    category === cat && !customCategory
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Or type custom category..."
              className="w-full px-4 py-2 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-medium"
            />
          </div>

          {/* Monthly Target Days */}
          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              Monthly Target (Days)
            </label>
            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value) || daysInMonth)}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-slate-900 dark:focus:border-white shadow-2xs font-mono font-bold"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Default is all {daysInMonth} days of the month.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white dark:text-[#0f1013] bg-slate-900 dark:bg-[#faf6ee] hover:bg-slate-800 dark:hover:bg-white dark:border dark:border-[#f6da7e]/40 dark:shadow-[0_0_12px_rgba(246,218,126,0.3)] rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{habitToEdit ? 'Save Changes' : 'Add Habit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
