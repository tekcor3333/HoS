import { DailyTodoTask } from '../types';

export const DAILY_TODOS_STORAGE_KEY = 'habitos_daily_todos_v2';

/**
 * Formats calendar date into ISO date key: YYYY-MM-DD
 */
export function formatDateKey(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD back to { year, month, day }
 */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { year: y || 2026, month: m || 11, day: d || 1 };
}

/**
 * Realistic default starter tasks - every date has its own distinct, independent checklist
 */
export const SAMPLE_DAILY_TODOS: Record<string, DailyTodoTask[]> = {
  // Sunday 01.11.2026
  '2026-11-01': [
    {
      id: 'todo-2026-11-01-1',
      date: '2026-11-01',
      title: 'Weekly planning & goals review',
      description: 'Review habit consistency and set targets for week 1',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-01T08:00:00.000Z',
    },
    {
      id: 'todo-2026-11-01-2',
      date: '2026-11-01',
      title: 'Meal prep for Monday–Wednesday',
      description: 'Healthy lunches and protein snacks',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'todo-2026-11-01-3',
      date: '2026-11-01',
      title: 'Call family in the evening',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-01T14:00:00.000Z',
    },
  ],

  // Monday 02.11.2026
  '2026-11-02': [
    {
      id: 'todo-2026-11-02-1',
      date: '2026-11-02',
      title: 'Complete assignment',
      description: 'Finish algorithm analysis problem set',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-02T09:00:00.000Z',
    },
    {
      id: 'todo-2026-11-02-2',
      date: '2026-11-02',
      title: 'Gym — chest & triceps',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-02T11:00:00.000Z',
    },
    {
      id: 'todo-2026-11-02-3',
      date: '2026-11-02',
      title: 'Read 20 pages',
      description: 'System Design Interview book',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-02T13:00:00.000Z',
    },
    {
      id: 'todo-2026-11-02-4',
      date: '2026-11-02',
      title: 'Team sync on Q4 deliverables',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-02T15:30:00.000Z',
    },
  ],

  // Tuesday 03.11.2026
  '2026-11-03': [
    {
      id: 'todo-2026-11-03-1',
      date: '2026-11-03',
      title: 'Project meeting with design team',
      description: 'Review Liquid Glass mobile dock feedback',
      priority: 'high',
      completed: false,
      createdAt: '2026-11-03T09:30:00.000Z',
    },
    {
      id: 'todo-2026-11-03-2',
      date: '2026-11-03',
      title: 'Revise physics chapter 4',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-03T11:00:00.000Z',
    },
    {
      id: 'todo-2026-11-03-3',
      date: '2026-11-03',
      title: 'Buy notebook & sketch pens',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-03T14:15:00.000Z',
    },
  ],

  // Wednesday 04.11.2026
  '2026-11-04': [
    {
      id: 'todo-2026-11-04-1',
      date: '2026-11-04',
      title: 'Finish presentation deck',
      description: 'Slide deck for client progress review',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-04T08:30:00.000Z',
    },
    {
      id: 'todo-2026-11-04-2',
      date: '2026-11-04',
      title: 'Exercise — cardio interval run',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-04T12:00:00.000Z',
    },
    {
      id: 'todo-2026-11-04-3',
      date: '2026-11-04',
      title: 'Review pull request #42',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-04T16:00:00.000Z',
    },
  ],

  // Thursday 05.11.2026
  '2026-11-05': [
    {
      id: 'todo-2026-11-05-1',
      date: '2026-11-05',
      title: 'Draft client report',
      description: 'Compile monthly analytics and consistency rates',
      priority: 'high',
      completed: false,
      createdAt: '2026-11-05T09:00:00.000Z',
    },
    {
      id: 'todo-2026-11-05-2',
      date: '2026-11-05',
      title: 'Dentist appointment at 16:30',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-05T13:00:00.000Z',
    },
    {
      id: 'todo-2026-11-05-3',
      date: '2026-11-05',
      title: 'Organize research documents',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-05T17:00:00.000Z',
    },
  ],

  // Friday 06.11.2026
  '2026-11-06': [
    {
      id: 'todo-2026-11-06-1',
      date: '2026-11-06',
      title: 'Finalize weekly deliverables',
      description: 'Ship version 1.4 update to production',
      priority: 'high',
      completed: true,
      createdAt: '2026-11-06T09:00:00.000Z',
    },
    {
      id: 'todo-2026-11-06-2',
      date: '2026-11-06',
      title: 'Submit expense receipts',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-06T14:00:00.000Z',
    },
    {
      id: 'todo-2026-11-06-3',
      date: '2026-11-06',
      title: 'Clean workspace & desk cleanup',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-06T17:30:00.000Z',
    },
  ],

  // Saturday 07.11.2026
  '2026-11-07': [
    {
      id: 'todo-2026-11-07-1',
      date: '2026-11-07',
      title: 'Morning trail run 5km',
      priority: 'medium',
      completed: true,
      createdAt: '2026-11-07T07:30:00.000Z',
    },
    {
      id: 'todo-2026-11-07-2',
      date: '2026-11-07',
      title: 'Grocery restocking & farmer market',
      priority: 'low',
      completed: true,
      createdAt: '2026-11-07T10:30:00.000Z',
    },
    {
      id: 'todo-2026-11-07-3',
      date: '2026-11-07',
      title: 'Read 30 minutes in evening',
      priority: 'low',
      completed: false,
      createdAt: '2026-11-07T19:00:00.000Z',
    },
  ],
};

/**
 * Load all daily todos from localStorage or initialize with sample todos
 */
export function loadDailyTodos(): Record<string, DailyTodoTask[]> {
  if (typeof window === 'undefined') return SAMPLE_DAILY_TODOS;

  try {
    const raw = localStorage.getItem(DAILY_TODOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, DailyTodoTask[]>;
      }
    }
  } catch (err) {
    console.error('Failed to load daily todos from localStorage:', err);
  }

  // Initialize and persist starter sample todos
  saveDailyTodos(SAMPLE_DAILY_TODOS);
  return SAMPLE_DAILY_TODOS;
}

/**
 * Persist all daily todos to localStorage
 */
export function saveDailyTodos(todos: Record<string, DailyTodoTask[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_TODOS_STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    console.error('Failed to save daily todos to localStorage:', err);
  }
}

/**
 * Get tasks specifically for a given dateKey (YYYY-MM-DD)
 */
export function getTasksForDate(
  todos: Record<string, DailyTodoTask[]>,
  dateKey: string
): DailyTodoTask[] {
  return todos[dateKey] || [];
}

/**
 * Calculate dynamic completion progress for a specific day
 */
export function calculateDateProgress(tasks: DailyTodoTask[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  const total = tasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  const completed = tasks.filter((t) => t.completed).length;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, percentage };
}
