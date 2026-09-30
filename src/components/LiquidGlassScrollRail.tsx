import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SectionMarker {
  id: string;
  name: string;
  topProgress: number; // 0 to 1
}

const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

const getScrollMetrics = () => {
  const scrollTop =
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    document.documentElement.clientHeight
  );
  const clientHeight =
    window.innerHeight || document.documentElement.clientHeight || 1;
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  const scrollProgress = maxScroll > 0 ? clamp(scrollTop / maxScroll, 0, 1) : 0;

  return { scrollTop, scrollHeight, clientHeight, maxScroll, scrollProgress };
};

interface LiquidGlassScrollRailProps {
  activeView?: string;
  isTransitioning?: boolean;
}

export const LiquidGlassScrollRail: React.FC<LiquidGlassScrollRailProps> = ({
  activeView,
  isTransitioning = false,
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [thumbHeight, setThumbHeight] = useState<number>(56);
  const [trackHeight, setTrackHeight] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isScrollable, setIsScrollable] = useState<boolean>(true);
  const [sections, setSections] = useState<SectionMarker[]>([]);

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartThumbOffsetRef = useRef<number>(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Keep ref in sync for event listeners
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Permanent discoverability: always visible in resting state, brightens on interaction
  const triggerActivity = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Scan and catalog page sections for Apple-style rail ticks & preview badges
  const scanSections = useCallback(() => {
    const sectionDefinitions = [
      { id: 'overview', name: 'Overview' },
      { id: 'daily-checkin', name: 'Check-In' },
      { id: 'monthly-grid', name: 'Habit Grid' },
      { id: 'weekly-summary', name: 'Weekly' },
      { id: 'habit-analysis', name: 'Analysis' },
      { id: 'goals', name: 'Goals' },
      { id: 'history', name: 'History' },
    ];

    const { maxScroll } = getScrollMetrics();
    if (maxScroll <= 0) {
      setSections([]);
      return;
    }

    const currentScrollY =
      window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const foundSections: SectionMarker[] = [];
    sectionDefinitions.forEach(({ id, name }) => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + currentScrollY;
        const progress = clamp(absoluteTop / maxScroll, 0.02, 0.98);
        foundSections.push({ id, name, topProgress: progress });
      }
    });

    setSections(foundSections);
  }, []);

  // Update geometry: track height, thumb height, scroll progress
  const updateMetrics = useCallback(() => {
    const {
      scrollHeight,
      clientHeight,
      maxScroll,
      scrollProgress: currentProgress,
    } = getScrollMetrics();

    setIsScrollable(maxScroll > 10);
    setScrollProgress(currentProgress);

    const el = trackRef.current;
    if (el) {
      const currentTrackHeight = el.clientHeight;
      if (currentTrackHeight > 0) {
        setTrackHeight(currentTrackHeight);
        // Proportional Apple thumb sizing: min 42px or 12% of rail, max 35% of rail height
        const rawThumbSize = (clientHeight / scrollHeight) * currentTrackHeight;
        const minThumb = Math.min(42, Math.max(28, currentTrackHeight * 0.12));
        const maxThumb = currentTrackHeight * 0.35;
        const calculatedThumb = clamp(rawThumbSize, minThumb, maxThumb);
        setThumbHeight(calculatedThumb);
      }
    }
  }, []);

  // Synchronize on native scroll and resize
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      triggerActivity();
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateMetrics();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      updateMetrics();
      scanSections();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const bodyObserver = new ResizeObserver(() => {
      updateMetrics();
      scanSections();
    });
    bodyObserver.observe(document.body);

    const trackObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    if (trackRef.current) {
      trackObserver.observe(trackRef.current);
    }

    updateMetrics();
    scanSections();
    triggerActivity();

    // Safety listener in case pointer up happened outside
    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        document.body.style.userSelect = '';
        triggerActivity();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      bodyObserver.disconnect();
      trackObserver.disconnect();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [updateMetrics, scanSections, triggerActivity]);

  // Re-synchronize metrics and section markers when active view changes
  useEffect(() => {
    updateMetrics();
    scanSections();
    const timer = setTimeout(() => {
      updateMetrics();
      scanSections();
    }, 420);
    return () => clearTimeout(timer);
  }, [activeView, updateMetrics, scanSections]);

  // Pointer Drag handling on Liquid Glass Thumb
  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer so dragging is unbreakable even if pointer wanders across window
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setIsDragging(true);
    setIsVisible(true);
    dragStartYRef.current = e.clientY;

    const currentTrackHeight = trackRef.current
      ? trackRef.current.clientHeight
      : trackHeight || window.innerHeight - 24;
    const currentThumbHeight = thumbRef.current
      ? thumbRef.current.clientHeight
      : thumbHeight;
    const maxThumbTravel = Math.max(0, currentTrackHeight - currentThumbHeight);
    const initialThumbOffset = clamp(
      scrollProgress * maxThumbTravel,
      0,
      maxThumbTravel
    );
    dragStartThumbOffsetRef.current = initialThumbOffset;

    // Prevent text selection during active drag
    document.body.style.userSelect = 'none';
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();

    const currentTrackHeight = trackRef.current
      ? trackRef.current.clientHeight
      : trackHeight || window.innerHeight - 24;
    const currentThumbHeight = thumbRef.current
      ? thumbRef.current.clientHeight
      : thumbHeight;
    const maxThumbTravel = Math.max(0, currentTrackHeight - currentThumbHeight);
    if (maxThumbTravel <= 0) return;

    const deltaY = e.clientY - dragStartYRef.current;
    // Strictly clamp the dragged thumb position between 0 and maxThumbTravel
    const targetThumbOffset = clamp(
      dragStartThumbOffsetRef.current + deltaY,
      0,
      maxThumbTravel
    );
    const targetProgress = targetThumbOffset / maxThumbTravel;

    setScrollProgress(targetProgress);

    const { maxScroll } = getScrollMetrics();
    const newScrollY = targetProgress * maxScroll;

    window.scrollTo({
      top: newScrollY,
      behavior: 'auto', // zero-latency direct response
    });
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
      document.body.style.userSelect = '';
      triggerActivity();
    }
  };

  // Track Click Handling: click anywhere along the rail to glide smoothly to position
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.target === thumbRef.current ||
      thumbRef.current?.contains(e.target as Node)
    ) {
      return;
    }
    e.preventDefault();

    if (!trackRef.current) return;
    const trackRect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;

    const currentTrackHeight = trackRef.current.clientHeight;
    const currentThumbHeight = thumbRef.current
      ? thumbRef.current.clientHeight
      : thumbHeight;
    const maxThumbTravel = Math.max(0, currentTrackHeight - currentThumbHeight);
    if (maxThumbTravel <= 0) return;

    // Center thumb on click position, strictly clamped to valid range [0, maxThumbTravel]
    const targetThumbOffset = clamp(
      clickY - currentThumbHeight / 2,
      0,
      maxThumbTravel
    );
    const targetProgress = targetThumbOffset / maxThumbTravel;

    setScrollProgress(targetProgress);

    const { maxScroll } = getScrollMetrics();
    const targetScrollY = targetProgress * maxScroll;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });

    triggerActivity();
  };

  // Exact position calculation as specified:
  // MAX_THUMB_TRAVEL = TRACK_HEIGHT - THUMB_HEIGHT
  // thumbOffset = clamp(scrollProgress * (trackHeight - thumbHeight), 0, trackHeight - thumbHeight)
  const effectiveTrackHeight =
    (trackRef.current && trackRef.current.clientHeight > 0
      ? trackRef.current.clientHeight
      : trackHeight) ||
    (typeof window !== 'undefined' ? window.innerHeight - 24 : 600);
  const effectiveThumbHeight = thumbHeight > 0 ? thumbHeight : 56;
  const maxThumbTravel = Math.max(
    0,
    effectiveTrackHeight - effectiveThumbHeight
  );
  const thumbOffset = clamp(scrollProgress * maxThumbTravel, 0, maxThumbTravel);
  const scrollPercentage = Math.round(scrollProgress * 100);
  const isInteracting = isDragging || isHovered || isVisible;

  return (
    <aside
      aria-label="Liquid Glass Scroll Navigation"
      className="fixed right-2 sm:right-3 md:right-4 top-3 bottom-3 z-50 flex items-center justify-center select-none pointer-events-none"
      style={{
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Ergonomic hover & touch detection lane - dynamic responsive height */}
      <div
        className="relative flex items-center justify-center pointer-events-auto h-full max-h-[calc(100vh-24px)] w-7 group"
        onMouseEnter={() => {
          setIsHovered(true);
          triggerActivity();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          triggerActivity();
        }}
        style={{ width: '28px' }}
      >
        {/* 1. THE VERTICAL LIQUID GLASS TRACK */}
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="liquid-glass-track relative h-full mx-auto rounded-full cursor-pointer transition-all duration-300 ease-out"
          style={{
            width: isHovered || isDragging ? '8px' : '5px',
            opacity: isHovered || isDragging ? 1 : 0.82,
            transition:
              'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, border-color 0.3s ease, background 0.3s ease',
          }}
        >
          {/* Subtle Section Marker Ticks along Rail */}
          {sections.map((sec) => {
            const isPassed = scrollProgress >= sec.topProgress - 0.02;
            return (
              <button
                key={sec.id}
                type="button"
                aria-label={`Scroll to ${sec.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById(sec.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    triggerActivity();
                  }
                }}
                className="absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-300 hover:scale-150 cursor-pointer p-0 m-0 border-0 outline-none z-10"
                style={{
                  top: `${sec.topProgress * 100}%`,
                  width: isHovered ? '7px' : '3.5px',
                  height: '2px',
                  backgroundColor: isPassed
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.35)',
                  boxShadow: isPassed
                    ? '0 0 5px rgba(255, 255, 255, 0.9)'
                    : 'none',
                }}
                title={`Jump to ${sec.name}`}
              />
            );
          })}

          {/* 2. THE LIQUID GLASS SCROLL THUMB - Strictly constrained inside the track */}
          <div
            ref={thumbRef}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerUp}
            tabIndex={0}
            role="scrollbar"
            aria-valuenow={scrollPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-orientation="vertical"
            className={`liquid-glass-thumb absolute rounded-full cursor-grab active:cursor-grabbing will-change-transform z-20 ${
              isDragging
                ? 'liquid-glass-thumb-active scale-110 cursor-grabbing'
                : 'hover:scale-105'
            }`}
            style={{
              top: 0,
              left: '50%',
              height: `${effectiveThumbHeight}px`,
              width: isHovered || isDragging ? '11px' : '7px',
              transform: `translate3d(-50%, ${thumbOffset}px, 0)`,
              transition: isDragging
                ? 'width 0.2s ease, transform 0.04s ease-out'
                : 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Top Liquid Specular Glint */}
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 w-3/4 rounded-full bg-white pointer-events-none opacity-90 transition-opacity"
              style={{
                height: '3px',
                filter: 'blur(0.5px)',
              }}
            />

            {/* Center Fluid Core indicator */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-300 ${
                isDragging
                  ? 'w-1 h-3 bg-white shadow-[0_0_6px_rgba(255,255,255,0.95)] opacity-95'
                  : 'w-0.5 h-2 bg-white/80 opacity-60'
              }`}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
