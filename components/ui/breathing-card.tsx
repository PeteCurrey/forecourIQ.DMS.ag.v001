'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BreathingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'surface' | 'surface-raised' | 'glass';
  glowPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' | 'none';
  breathing?: boolean;
  ambientDrift?: boolean;
  intensity?: 'subtle' | 'medium' | 'high';
  className?: string;
  as?: React.ElementType;
}

/**
 * BreathingCard — 3D "breathing" motion container with electric blue ambient bleed.
 *
 * Implements:
 * - Subtle alive scale (1.0 -> 1.015) & translateY (±4px) pulse on a 9s ease-in-out loop
 * - Ambient gradient drift behind glassmorphism surfaces (20s cycle)
 * - Soft elevated glassmorphic border & electric-blue shadow bleed
 * - Automatic prefers-reduced-motion cancellation
 */
export function BreathingCard({
  children,
  variant = 'surface',
  glowPosition = 'top-right',
  breathing = true,
  ambientDrift = true,
  intensity = 'medium',
  className,
  as: Component = 'div',
  ...props
}: BreathingCardProps) {
  const glowStyles = {
    'top-right': 'top-0 right-0 -mr-16 -mt-16',
    'top-left': 'top-0 left-0 -ml-16 -mt-16',
    'bottom-right': 'bottom-0 right-0 -mr-16 -mb-16',
    'bottom-left': 'bottom-0 left-0 -ml-16 -mb-16',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'none': 'hidden',
  };

  const opacityMap = {
    subtle: 'opacity-10 dark:opacity-15',
    medium: 'opacity-15 dark:opacity-25',
    high: 'opacity-25 dark:opacity-40',
  };

  const variantStyles = {
    surface: 'bg-surface border-border text-text-primary',
    'surface-raised': 'bg-surface-raised border-border text-text-primary shadow-lg',
    glass: 'glass-elevated text-text-primary',
  };

  return (
    <Component
      className={cn(
        'relative rounded-xl border p-6 transition-all duration-300 overflow-hidden',
        variantStyles[variant],
        breathing && 'breathing',
        'hover:border-primary/40 hover:shadow-glow-primary',
        className
      )}
      {...props}
    >
      {/* Slow Ambient Radial Gradient Drift */}
      {glowPosition !== 'none' && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute w-64 h-64 rounded-full blur-3xl transition-opacity',
            glowStyles[glowPosition],
            opacityMap[intensity],
            ambientDrift && 'ambient-drift'
          )}
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, rgba(0, 71, 255, 0) 70%)',
          }}
        />
      )}

      {/* Subtle hairline edge highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 opacity-50 dark:opacity-100"
      />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}

export interface BreathingCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  withGrid?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  className?: string;
}

/**
 * BreathingCanvas — Hero and large dashboard visual canvas with slow alive depth.
 */
export function BreathingCanvas({
  children,
  withGrid = true,
  glowIntensity = 'medium',
  className,
  ...props
}: BreathingCanvasProps) {
  const intensityMap = {
    low: 'opacity-10',
    medium: 'opacity-20',
    high: 'opacity-30',
  };

  return (
    <div
      className={cn(
        'relative w-full bg-canvas text-text-primary overflow-hidden transition-colors',
        className
      )}
      {...props}
    >
      {/* Ambient Electric-Blue Light Cones */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] ambient-drift',
          intensityMap[glowIntensity]
        )}
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, rgba(0, 71, 255, 0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] ambient-drift',
          intensityMap[glowIntensity]
        )}
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, rgba(0, 71, 255, 0) 70%)',
          animationDelay: '-10s',
        }}
      />

      {/* Optional Subtle Automotive Grid Mesh */}
      {withGrid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, var(--color-text-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-text-primary) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default BreathingCard;
