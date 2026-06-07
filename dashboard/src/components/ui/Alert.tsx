import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './utils/cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const CONFIG: Record<
  AlertVariant,
  { icon: LucideIcon; iconColor: string; role: 'status' | 'alert' }
> = {
  info: { icon: Info, iconColor: 'text-accent', role: 'status' },
  success: { icon: CheckCircle2, iconColor: 'text-positive', role: 'status' },
  warning: { icon: AlertTriangle, iconColor: 'text-warn', role: 'alert' },
  error: { icon: XCircle, iconColor: 'text-negative', role: 'alert' },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** Optional action node (e.g. a retry Button) rendered on the right. */
  action?: ReactNode;
}

/**
 * Inline notice — soft surface card with a tinted icon (modern dark).
 * role="alert" for warning/error (assertive), role="status" otherwise (polite).
 */
export function Alert({ variant = 'info', title, children, className, action }: AlertProps) {
  const { icon: Icon, iconColor, role } = CONFIG[variant];

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-line bg-surface-raised p-4 text-sm text-content',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-content">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-content-muted')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
