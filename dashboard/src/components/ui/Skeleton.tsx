import type { HTMLAttributes } from 'react';
import { cn } from './utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const ROUNDED = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const;

/**
 * Single shimmering placeholder block. Decorative — hidden from screen readers
 * (the surrounding region should expose an aria-busy/loading state instead).
 */
export function Skeleton({ rounded = 'md', className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-white/[0.06]', ROUNDED[rounded], className)}
      {...props}
    />
  );
}

export interface SkeletonTextProps {
  /** Number of lines to render. */
  lines?: number;
  className?: string;
}

/**
 * Multi-line text placeholder. The last line is shortened for realism.
 */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
