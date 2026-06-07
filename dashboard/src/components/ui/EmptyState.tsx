import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from './utils/cn';

export interface EmptyStateProps {
  /** Icon component (decorative). Defaults to an inbox glyph. */
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (e.g. a Button). */
  action?: ReactNode;
  className?: string;
  /** Compact variant for inline/table contexts. */
  size?: 'sm' | 'md';
}

/**
 * Centered empty/zero-data placeholder (modern dark). The icon is decorative;
 * the title carries meaning for assistive tech.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'md' ? 'gap-4 px-6 py-16' : 'gap-3 px-4 py-10',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-line bg-surface-raised text-content-subtle',
          size === 'md' ? 'h-12 w-12' : 'h-10 w-10',
        )}
      >
        <Icon className={size === 'md' ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3
          className={cn(
            'font-semibold tracking-tight text-content',
            size === 'md' ? 'text-base' : 'text-sm',
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="max-w-sm text-sm text-content-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
