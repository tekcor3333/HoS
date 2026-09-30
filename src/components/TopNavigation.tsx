import React from 'react';
import { Plus, Download, RotateCcw, Calendar, Maximize2 } from 'lucide-react';
import { CelestialThemeToggle } from './CelestialThemeToggle';
import { useAuth } from '../utils/authContext';
import { AppView } from '../types';

interface TopNavigationProps {
  activeView: AppView;
  onNavigate: (view: AppView, originRect?: DOMRect) => void;
  onAddHabit: () => void;
  onExport: () => void;
  onReset: () => void;
  currentMonthName: string;
  currentYear: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenShowcase?: () => void;
  onOpenJoin?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeView,
  onNavigate,
  onAddHabit,
  onExport,
  onReset,
  currentMonthName,
  currentYear,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenShowcase,
  onOpenJoin,
}) => {
  const { user, isAuthenticated } = useAuth();

  const navItems: { id: AppView; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'check-in', label: 'Check-In' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'grid', label: 'Grid' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'goals', label: 'Goals' },
    { id: 'history', label: 'History' },
  ];

  return (
    <header className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 px-2 sm:px-4 lg:px-8 max-w-[min(96vw,1390px)] w-full mx-auto pointer-events-none transition-all duration-300">
      {/* The Tourera Signature Floating Translucent Glass Bar matching uploaded image.png */}
      <div className="tourera-floating-bar rounded-full h-12 sm:h-14 w-full px-3 sm:px-6 flex items-center justify-between text-slate-900 dark:text-white flex-nowrap overflow-hidden pointer-events-auto">
        
        {/* Zone 1: Brand & Logo (Tourera Hex-Loop Style) */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 min-w-0">
          <button
            type="button"
            data-nav-tab="overview"
            onClick={(e) => onNavigate('overview', e.currentTarget.getBoundingClientRect())}
            title="HabitOS Home / Overview"
            className="flex items-center gap-2 sm:gap-2.5 text-slate-900 dark:text-white font-semibold tracking-tight hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-full bg-slate-900 text-white dark:bg-[#faf6ee] dark:text-[#0f1013] flex items-center justify-center font-black text-xs sm:text-sm shadow-sm dark:shadow-[0_0_10px_rgba(246,218,126,0.4)] shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-[20px] sm:h-[20px] fill-white dark:fill-[#0f1013]">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 3.2L18.5 9 12 12.8 5.5 9 12 5.2zm-7 5.3l6 3.5v6.8l-6-3.4v-6.9zm14 6.9l-6 3.4v-6.8l6-3.5v6.9z"/>
              </svg>
            </div>
            <div className="flex flex-col items-center leading-none">
              <span
                className="text-lg sm:text-[22px] font-bold text-slate-950 dark:text-[#faf6ee] whitespace-nowrap no-underline transition-all leading-none"
                style={{
                  fontFamily: '"Bodoni Moda", "Playfair Display", "DM Serif Display", "Times New Roman", serif',
                  letterSpacing: '-0.02em',
                }}
              >
                HoS
              </span>
            </div>
          </button>

          {/* Mobile Current View Pill */}
          <span className="md:hidden text-[10px] font-bold text-slate-800 dark:text-white px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 uppercase tracking-wider">
            {navItems.find((n) => n.id === activeView)?.label || 'Overview'}
          </span>

          <div className="h-4 w-px bg-slate-300 dark:bg-white/20 hidden xl:block shrink-0" />

          {/* Month Indicator */}
          <button
            type="button"
            data-nav-tab="overview-month"
            onClick={(e) => onNavigate('overview', e.currentTarget.getBoundingClientRect())}
            title="Go to Monthly Overview"
            className="text-xs text-slate-600 dark:text-white/70 font-medium hidden xl:inline-flex items-center gap-1.5 shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-white/60 shrink-0" />
            <span className="text-slate-900 dark:text-white font-semibold truncate">{currentMonthName} {currentYear}</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Real Internal SPA View Switching) */}
        <nav
          className="hidden md:flex items-center gap-3 lg:gap-4.5 text-slate-700 dark:text-white/80 font-bold shrink min-w-0"
          style={{
            fontSize: '12px',
            lineHeight: '11px',
            fontFamily: 'system-ui',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textDecorationLine: 'none',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-nav-tab={item.id}
                onClick={(e) => onNavigate(item.id, e.currentTarget.getBoundingClientRect())}
                className={`relative py-1.5 px-0.5 transition-all duration-200 cursor-pointer font-bold select-none ${
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-slate-950 dark:bg-[#f6da7e] dark:shadow-[0_0_8px_rgba(246,218,126,0.85)] rounded-full transition-all duration-300" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Celestial Solar-Lunar Theme Switch */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Faithful reproduction of the video's Celestial Molten Plasma Theme Toggle */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <CelestialThemeToggle
              isDarkMode={isDarkMode}
              onToggle={onToggleDarkMode || (() => {})}
              size="sm"
            />
            {onOpenShowcase && (
              <button
                type="button"
                onClick={onOpenShowcase}
                title="Open Fullscreen Celestial Switch Studio"
                className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-white/60 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={onReset}
            title="Reset sample data"
            className="p-2 text-slate-600 hover:text-slate-950 dark:text-white/70 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer hidden lg:flex items-center shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExport}
            title="Export data as JSON"
            className="p-2 text-slate-600 hover:text-slate-950 dark:text-white/70 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer hidden lg:flex items-center shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Join / Authenticated User Profile Button */}
          {isAuthenticated && user ? (
            <button
              onClick={onOpenJoin}
              title={`Logged in as ${user.name} (${user.email}) - Click to manage account`}
              className="tourera-pill-btn-white rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer font-medium shadow-sm transition-all shrink-0 h-8 sm:h-[41.6px] min-w-[68px] sm:min-w-[81.35px]"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-slate-300 dark:border-white/30 shrink-0"
                />
              ) : (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] sm:text-xs font-bold truncate max-w-[60px] sm:max-w-[80px]">
                {user.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenJoin}
              className="tourera-pill-btn-white rounded-full px-3 sm:px-4 py-1 sm:py-2 flex items-center justify-center gap-1 cursor-pointer font-bold shrink-0 shadow-sm h-8 sm:h-[41.6px] min-w-[68px] sm:min-w-[81.35px] text-[13px] sm:text-[15px]"
              style={{
                lineHeight: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <span>Join</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
