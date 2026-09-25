import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CelestialThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showModeSelector?: boolean;
  className?: string;
}

// GLSL Shaders for the molten plasma solar/lunar body
const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_progress;   // 0.0 (Left: Moon/Eclipse) -> 1.0 (Right: Sun)
  uniform float u_moon_type;  // 0.0 = Crescent Moon, 1.0 = Annular Eclipse Ring
  uniform float u_hover;
  uniform float u_aspect;

  // Procedural noise functions for solar granules and churning plasma
  float hash(vec2 p) {
    p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
    return -1.0 + 2.0 * fract(16.0 * p.x * p.y * (p.x + p.y));
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; ++i) {
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(10.0);
      a *= 0.5;
    }
    return v;
  }

  // Color mapping palette for fiery solar plasma
  vec3 firePalette(float t) {
    t = clamp(t, 0.0, 1.3);
    vec3 c0 = vec3(0.05, 0.01, 0.0);     // Void dark red
    vec3 c1 = vec3(0.65, 0.08, 0.0);     // Deep crimson flare
    vec3 c2 = vec3(1.0, 0.35, 0.02);     // Intense solar orange
    vec3 c3 = vec3(1.0, 0.72, 0.12);     // Radiant solar amber
    vec3 c4 = vec3(1.0, 0.98, 0.7);      // White-hot solar core

    if (t < 0.25) return mix(c0, c1, t / 0.25);
    if (t < 0.55) return mix(c1, c2, (t - 0.25) / 0.30);
    if (t < 0.85) return mix(c2, c3, (t - 0.55) / 0.30);
    return mix(c3, c4, clamp((t - 0.85) / 0.40, 0.0, 1.0));
  }

  void main() {
    // Coordinate normalization with correct aspect ratio
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 uv = (st * 2.0 - 1.0);
    uv.x *= u_aspect;

    // Horizontal travel range inside the capsule track
    float trackTravel = 0.52 * u_aspect;
    vec2 leftPos = vec2(-trackTravel + 0.32, 0.0);
    vec2 rightPos = vec2(trackTravel - 0.32, 0.0);
    vec2 orbCenter = mix(leftPos, rightPos, u_progress);

    vec2 p = uv - orbCenter;
    float dist = length(p);
    float angle = atan(p.y, p.x);

    // Orb base radius
    float R = 0.38;

    // Fluid turbulence and rotating convection currents
    float rotSpeed = 0.65;
    float swirl = angle + u_time * rotSpeed * (0.4 + 0.3 * (1.0 - u_progress));
    vec2 polarP = vec2(cos(swirl), sin(swirl)) * dist;

    // Multi-octave convective noise
    vec2 flow = polarP * 4.2 + vec2(u_time * 0.4, -u_time * 0.3);
    float n1 = fbm(flow);
    float n2 = fbm(flow * 1.8 - n1 * 1.2 + vec2(0.0, u_time * 0.5));
    float turbulence = (n1 * 0.6 + n2 * 0.4);

    // 3D Spherical Normal Mapping
    float z = sqrt(max(0.0, R * R - dist * dist));
    vec3 normal = normalize(vec3(p.x, p.y, z));
    float sphereShade = dot(normal, normalize(vec3(0.2, 0.2, 0.95)));

    // --- MASK CALCULATION: Sun vs Crescent vs Eclipse ---
    // 1. Full sun sphere boundary
    float sunMask = 1.0 - smoothstep(R - 0.015, R + 0.015, dist);

    // 2. Crescent moon cutter (left side, curved horns facing inward)
    vec2 cutterOffset = vec2(R * 0.46, 0.0);
    float cutterDist = length(p - cutterOffset);
    float cutterR = R * 0.90;
    float crescentCutout = smoothstep(cutterR - 0.02, cutterR + 0.02, cutterDist);
    float crescentShape = sunMask * crescentCutout;

    // 3. Annular Eclipse Ring (ring of fire with central void)
    float ringRadius = R * 0.72;
    float ringInnerDist = smoothstep(ringRadius - 0.16, ringRadius, dist);
    float ringShape = sunMask * ringInnerDist;

    // Combine Moon types: Crescent (0.0) or Ring of Fire (1.0)
    float lunarShape = mix(crescentShape, ringShape, u_moon_type);

    // Smoothly morph between Lunar (left) and Full Sun (right)
    // As u_progress increases, the cutter smoothly slides away and the center fills in
    float morphPhase = smoothstep(0.0, 1.0, u_progress);
    float bodyShape = mix(lunarShape, sunMask, morphPhase);

    // Coronal plasma edge flares (radiating outward from the celestial body)
    float flareDist = dist / R;
    float coronaFibers = abs(sin(angle * 9.0 + u_time * 1.2 + n1 * 3.5));
    float coronaFalloff = pow(clamp(1.0 - (dist - R * 0.7) / (R * 1.6), 0.0, 1.0), 2.8);
    float coronaGlow = coronaFalloff * (0.55 + 0.45 * coronaFibers) * (1.1 + 0.15 * sin(u_time * 2.5));

    // For crescent/ring mode, restrict the corona flare to the illuminated contour
    float moonCoronaMultiplier = mix(
      clamp(smoothstep(0.0, 0.6, -p.x / R + 0.4), 0.2, 1.0),
      1.0,
      morphPhase
    );
    coronaGlow *= moonCoronaMultiplier;

    // Composite surface temperature & luminosity
    float surfaceHeat = (sphereShade * 0.5 + 0.5) + turbulence * 0.48;
    surfaceHeat += 0.25 * (1.0 - dist / R); // Extra brightness toward center

    // Boost hot core in Sun mode
    if (u_progress > 0.6) {
      surfaceHeat += 0.3 * (u_progress - 0.6) / 0.4;
    }

    vec3 plasmaColor = firePalette(surfaceHeat);

    // Corona color (golden-amber to deep fire orange)
    vec3 coronaColor = mix(vec3(1.0, 0.25, 0.01), vec3(1.0, 0.75, 0.15), coronaGlow);

    // Final color composition
    vec3 col = vec3(0.0);

    // Add Corona glow
    col += coronaColor * coronaGlow * 1.35;

    // Add Solid Plasma Body with crisp edge
    col = mix(col, plasmaColor, bodyShape);

    // Specular limb flare along the outer rim
    float rimFlare = smoothstep(R - 0.04, R, dist) * bodyShape;
    col += vec3(1.0, 0.85, 0.4) * rimFlare * 0.4;

    // Interior ambient floor reflection within the pill chamber
    float chamberReflection = pow(max(0.0, 1.0 - length(uv - orbCenter) * 0.8), 2.2) * 0.12;
    col += vec3(1.0, 0.45, 0.05) * chamberReflection;

    // Subtle edge fade to black at borders
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const CelestialThemeToggle: React.FC<CelestialThemeToggleProps> = ({
  isDarkMode,
  onToggle,
  size = 'md',
  showModeSelector = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<{ [key: string]: WebGLUniformLocation | null }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync prop refs so render loop and callbacks always see the latest values without re-binding
  const isDarkModeRef = useRef<boolean>(isDarkMode);
  isDarkModeRef.current = isDarkMode;
  const onToggleRef = useRef<() => void>(onToggle);
  onToggleRef.current = onToggle;

  // Progress value smoothly animating between 0.0 (Dark/Moon, Left) and 1.0 (Light/Sun, Right)
  const currentProgressRef = useRef<number>(isDarkMode ? 0.0 : 1.0);
  const targetProgressRef = useRef<number>(isDarkMode ? 0.0 : 1.0);

  // Settling physics state
  const isSettlingRef = useRef<boolean>(false);
  const toggleOnCompleteRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const dragInfoRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    initialProgress: number;
    initialIsDark: boolean;
    travelDistance: number;
    hasMoved: boolean;
    history: { x: number; time: number }[];
  } | null>(null);

  // Lunar mode: 0 = Crescent Moon, 1 = Eclipse Ring of Fire
  const [moonType, setMoonType] = useState<number>(0);
  const moonTypeTargetRef = useRef<number>(0);
  const currentMoonTypeRef = useRef<number>(0);

  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  // Helper to trigger settling animation towards a target
  const startSettling = useCallback((target: number, shouldToggle: boolean) => {
    targetProgressRef.current = Math.max(0.0, Math.min(1.0, target));
    isSettlingRef.current = true;
    toggleOnCompleteRef.current = shouldToggle;
  }, []);

  // Direct tap / keyboard toggle
  const handleDirectToggle = useCallback(() => {
    if (isDraggingRef.current) return;
    const nextTarget = isDarkModeRef.current ? 1.0 : 0.0;
    startSettling(nextTarget, true);
  }, [startSettling]);

  // Sync state when external props change (e.g. from another toggle or parent)
  useEffect(() => {
    // Only update target if user is not actively dragging or settling
    if (!isDraggingRef.current && !isSettlingRef.current) {
      targetProgressRef.current = isDarkMode ? 0.0 : 1.0;
    }
  }, [isDarkMode]);

  useEffect(() => {
    moonTypeTargetRef.current = moonType;
  }, [moonType]);

  // Size configurations
  const dimensions = {
    sm: { width: 92, height: 42, padding: 'p-1' },
    md: { width: 140, height: 64, padding: 'p-1.5' },
    lg: { width: 220, height: 100, padding: 'p-2' },
    hero: { width: 280, height: 128, padding: 'p-2.5' },
  }[size];

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      console.warn('WebGL not supported for CelestialThemeToggle, falling back');
      return;
    }
    glRef.current = gl;

    // Helper: compile shader
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Setup full-screen quad
    const quad = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Cache uniforms
    uniformsRef.current = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_progress: gl.getUniformLocation(program, 'u_progress'),
      u_moon_type: gl.getUniformLocation(program, 'u_moon_type'),
      u_hover: gl.getUniformLocation(program, 'u_hover'),
      u_aspect: gl.getUniformLocation(program, 'u_aspect'),
    };

    let startTime = performance.now();
    lastFrameTimeRef.current = performance.now();

    // Render loop with smooth spring damping
    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000.0;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTimeRef.current) / 1000.0));
      lastFrameTimeRef.current = now;

      if (isDraggingRef.current) {
        // While dragging: directly follow targetProgress with immediate 1:1 tactile response!
        currentProgressRef.current = targetProgressRef.current;
      } else {
        // Settling or animating to target
        const targetP = targetProgressRef.current;
        const currentP = currentProgressRef.current;
        const diff = targetP - currentP;

        if (Math.abs(diff) > 0.002) {
          // Frame-rate independent exponential spring glide towards target (settles cleanly in ~220ms)
          const step = 1.0 - Math.exp(-dt * 16.0);
          currentProgressRef.current += diff * Math.max(step, 0.08);
        } else {
          currentProgressRef.current = targetP;

          // If settling animation reached target end
          if (isSettlingRef.current) {
            isSettlingRef.current = false;
            if (toggleOnCompleteRef.current) {
              toggleOnCompleteRef.current = false;
              const willBeDark = targetP < 0.5;
              if (willBeDark !== isDarkModeRef.current) {
                onToggleRef.current();
              }
            }
          }
        }
      }

      // Damped interpolation for moon type morphing
      const targetM = moonTypeTargetRef.current;
      currentMoonTypeRef.current += (targetM - currentMoonTypeRef.current) * 0.15;

      const width = canvas.width;
      const height = canvas.height;
      const aspect = width / height;

      gl.viewport(0, 0, width, height);

      gl.uniform2f(uniformsRef.current.u_resolution, width, height);
      gl.uniform1f(uniformsRef.current.u_time, elapsed);
      gl.uniform1f(uniformsRef.current.u_progress, Math.max(0.0, Math.min(1.0, currentProgressRef.current)));
      gl.uniform1f(uniformsRef.current.u_moon_type, currentMoonTypeRef.current);
      gl.uniform1f(uniformsRef.current.u_hover, isHoveredRef.current ? 1.0 : 0.0);
      gl.uniform1f(uniformsRef.current.u_aspect, aspect);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (program && gl) {
        gl.deleteProgram(program);
      }
    };
  }, []);

  // Handle Drag Scrubbing & Click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;

    const container = containerRef.current;
    if (!container) return;

    try {
      container.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    const rect = container.getBoundingClientRect();
    // In shader: orb travel distance between left and right resting spots
    const travelDistance = Math.max(20, rect.width - rect.height * 0.72);

    isDraggingRef.current = true;
    isSettlingRef.current = false;
    toggleOnCompleteRef.current = false;

    dragInfoRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      initialProgress: currentProgressRef.current,
      initialIsDark: isDarkModeRef.current,
      travelDistance,
      hasMoved: false,
      history: [{ x: e.clientX, time: performance.now() }],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragInfoRef.current) return;
    if (e.pointerId !== dragInfoRef.current.pointerId) return;

    const drag = dragInfoRef.current;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    // Track movement history for velocity calculation
    const now = performance.now();
    drag.history.push({ x: e.clientX, time: now });
    if (drag.history.length > 8) drag.history.shift();

    // Distinguish intentional drag from accidental micro-jitter
    if (!drag.hasMoved && Math.hypot(dx, dy) >= 4) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      // Prevent unwanted browser scrolling during drag
      e.preventDefault();

      const deltaP = dx / drag.travelDistance;
      const rawProgress = drag.initialProgress + deltaP;

      // Soft edge resistance if user drags past the capsule bounds
      let boundedProgress = rawProgress;
      if (rawProgress < 0.0) {
        boundedProgress = rawProgress * 0.15;
      } else if (rawProgress > 1.0) {
        boundedProgress = 1.0 + (rawProgress - 1.0) * 0.15;
      }

      const clamped = Math.max(0.0, Math.min(1.0, boundedProgress));
      targetProgressRef.current = clamped;
      currentProgressRef.current = clamped;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragInfoRef.current) return;
    if (e.pointerId !== dragInfoRef.current.pointerId) return;

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    const drag = dragInfoRef.current;
    isDraggingRef.current = false;
    dragInfoRef.current = null;

    // Suppress redundant click event fired by browser after pointerup
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 300);

    // If pointer was released without significant drag movement, treat as crisp tap
    if (!drag.hasMoved) {
      handleDirectToggle();
      return;
    }

    // Calculate release velocity over recent window (last ~120ms)
    const now = performance.now();
    const recent = drag.history.filter((pt) => now - pt.time <= 120);
    let velocity = 0; // px/ms (+ rightward, - leftward)
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dt = last.time - first.time;
      if (dt > 12) {
        velocity = (last.x - first.x) / dt;
      }
    }

    const currentP = currentProgressRef.current;
    let targetModeIsLight = !drag.initialIsDark;
    let shouldSwitch = false;

    if (drag.initialIsDark) {
      // Started in Dark Mode (0.0, Moon). User dragged right toward Light Mode (Sun).
      // Threshold check:
      // 1. Distance threshold: >= 45% of travel (progress >= 0.45)
      // 2. Velocity flick: velocity > 0.22 px/ms (positive rightward flick) and dragged at least 18% (progress >= 0.18)
      const crossedThreshold = currentP >= 0.45 || (velocity > 0.22 && currentP >= 0.18);
      if (crossedThreshold) {
        targetModeIsLight = true;
        shouldSwitch = true;
      } else {
        // Cancel drag: return smoothly to Dark Mode
        targetModeIsLight = false;
        shouldSwitch = false;
      }
    } else {
      // Started in Light Mode (1.0, Sun). User dragged left toward Dark Mode (Moon).
      // Threshold check:
      // 1. Distance threshold: <= 55% progress (traveled >= 45% toward dark)
      // 2. Velocity flick: velocity < -0.22 px/ms (negative leftward flick) and progress <= 0.82
      const crossedThreshold = currentP <= 0.55 || (velocity < -0.22 && currentP <= 0.82);
      if (crossedThreshold) {
        targetModeIsLight = false;
        shouldSwitch = true;
      } else {
        // Cancel drag: return smoothly to Light Mode
        targetModeIsLight = true;
        shouldSwitch = false;
      }
    }

    const finalTargetProgress = targetModeIsLight ? 1.0 : 0.0;
    startSettling(finalTargetProgress, shouldSwitch);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    if (container && dragInfoRef.current) {
      try {
        container.releasePointerCapture(dragInfoRef.current.pointerId);
      } catch {
        // Ignore
      }
    }
    isDraggingRef.current = false;
    dragInfoRef.current = null;
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 300);

    // Cancel: gently restore to the current mode
    const restTarget = isDarkModeRef.current ? 0.0 : 1.0;
    startSettling(restTarget, false);
  };

  const toggleMoonVariant = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMoonType((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <div
      style={{
        fontSize: '52px',
        lineHeight: '30px',
        fontWeight: 'normal',
      }}
      className={`flex flex-col items-center select-none ${className}`}
    >
      {/* The Exact Pill Capsule Container with Specular Glass Rim matching the video */}
      <div
        ref={containerRef}
        role="switch"
        aria-checked={!isDarkMode}
        tabIndex={0}
        onClick={(e) => {
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleDirectToggle();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleDirectToggle();
          }
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          isHoveredRef.current = false;
        }}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
        className={`relative group cursor-pointer rounded-full overflow-hidden transition-all duration-300 transform active:scale-[0.98] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/80 shadow-2xl bg-black touch-none select-none`}
      >
        {/* Deep obsidian glass background */}
        <div
          style={{
            fontSize: '16px',
          }}
          className="absolute inset-0 bg-[#000000]"
        />

        {/* The WebGL Canvas rendering the living Solar-Lunar molten plasma body */}
        <canvas
          ref={canvasRef}
          width={dimensions.width * 2}
          height={dimensions.height * 2}
          style={{ width: '100%', height: '100%' }}
          className="absolute inset-0 pointer-events-none block"
        />

        {/* Signature Glass Specular Rim from video:
            - Brilliant upper specular highlight arc
            - Delicate double-beveled glass refraction
            - Subtle inner chamber shadow
        */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `
              inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.75),
              inset 0 0 1px 1px rgba(255, 255, 255, 0.25),
              inset 0 -1.5px 2px 0 rgba(255, 255, 255, 0.12),
              inset 0 6px 16px rgba(0, 0, 0, 0.85),
              0 0 0 1px rgba(255, 255, 255, 0.15)
            `,
          }}
        />

        {/* Top curved glass specular glare sheen */}
        <div
          className="absolute top-0 inset-x-4 h-[40%] rounded-t-full pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Subtle glass reflection lip at bottom */}
        <div
          className="absolute bottom-0 inset-x-6 h-[20%] rounded-b-full pointer-events-none opacity-20"
          style={{
            background: 'linear-gradient(0deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
      </div>

      {/* Optional Mode Switcher / Label info (for hero showcase) */}
      {showModeSelector && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMoonVariant}
            className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Night Mode Phase:</span>
            <strong className="text-amber-400">
              {moonType === 0 ? 'Crescent Moon 🌙' : 'Ring of Fire Eclipse ⭕'}
            </strong>
          </button>
        </div>
      )}
    </div>
  );
};
