import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils/cn';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

// Soft tinted pills — low-contrast fill + colored text (modern dark UI).
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-white/[0.06] text-content-muted',
  success: 'bg-positive-soft text-positive',
  warning: 'bg-warn-soft text-warn',
  danger: 'bg-negative-soft text-negative',
  info: 'bg-accent-soft text-accent',
  muted: 'bg-white/[0.04] text-content-subtle',
};

const DOT: Record<BadgeVariant, string> = {
  neutral: 'bg-content-muted',
  success: 'bg-positive',
  warning: 'bg-warn',
  danger: 'bg-negative',
  info: 'bg-accent',
  muted: 'bg-content-subtle',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Optional leading status dot. */
  dot?: boolean;
  /** Retained for API compatibility; no animation in this theme. */
  pulse?: boolean;
  leftIcon?: ReactNode;
}

/**
 * Compact status pill — soft tint, rounded-full. Decorative dot/icon are
 * aria-hidden so the label is the only thing announced.
 */
export function Badge({
  variant = 'neutral',
  dot = false,
  pulse: _pulse,
  leftIcon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT[variant])} aria-hidden="true" />}
      {leftIcon && (
        <span className="inline-flex" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children}
    </span>
  );
}
