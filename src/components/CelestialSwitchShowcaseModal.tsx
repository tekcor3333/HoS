import React from 'react';
import { X } from 'lucide-react';
import { CelestialThemeToggle } from './CelestialThemeToggle';

interface CelestialSwitchShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const CelestialSwitchShowcaseModal: React.FC<CelestialSwitchShowcaseModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
      {/* Container with pitch black background matching the video */}
      <div className="relative w-full max-w-xl bg-black border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Close showcase"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
            Celestial Plasma Theme Switch
          </h3>
        </div>

        {/* The Exact Video Replica Switch (Hero scale on pitch black background) */}
        <div className="py-8 sm:py-12 flex items-center justify-center w-full">
          <CelestialThemeToggle
            isDarkMode={isDarkMode}
            onToggle={onToggleDarkMode}
            size="hero"
            showModeSelector={false}
          />
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-6 text-xs font-mono text-slate-200 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Current Mode:</span>
            <span className="font-bold text-white px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20">
              {isDarkMode ? '🌙 Night (Lunar Plasma)' : '☀️ Day (Solar Star)'}
            </span>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex items-center justify-center w-full pt-4 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-white text-black font-bold hover:bg-slate-200 transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
