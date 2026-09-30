import React from 'react';
import { AppView } from '../types';
import {
  LayoutDashboard,
  CheckCircle2,
  ListTodo,
  Grid3X3,
  CalendarDays,
  BarChart3,
  Target,
  History,
} from 'lucide-react';

interface MobileBottomDockProps {
  activeView: AppView;
  onNavigate: (view: AppView, originRect?: DOMRect) => void;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeView,
  onNavigate,
}) => {
  const items: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'check-in',
      label: 'Check-In',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListTodo className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'grid',
      label: 'Grid',
      icon: <Grid3X3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'weekly',
      label: 'Weekly',
      icon: <CalendarDays className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: <Target className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-2.5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-16px)] w-auto px-1.5 py-1 rounded-full tourera-floating-bar shadow-2xl flex items-center justify-center gap-0.5 pointer-events-auto overflow-x-auto scrollbar-none"
      style={{
        backdropFilter: 'blur(36px) saturate(200%)',
        WebkitBackdropFilter: 'blur(36px) saturate(200%)',
      }}
    >
      {items.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-nav-tab={item.id}
            onClick={(e) => onNavigate(item.id, e.currentTarget.getBoundingClientRect())}
            className={`relative flex flex-col items-center justify-center px-2 py-1.5 rounded-full transition-all duration-200 cursor-pointer shrink-0 ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
            }`}
            title={item.label}
          >
            {item.icon}
            <span className="text-[9px] leading-tight font-medium mt-0.5 tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
