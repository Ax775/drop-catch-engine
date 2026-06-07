import { Loader2 } from 'lucide-react';
import { cn } from './utils/cn';

const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Accessible label announced to screen readers. Defaults to "Loading". */
  label?: string;
}

/**
 * Accessible loading indicator. Renders an aria-live status region with a
 * visually hidden label so screen readers announce the loading state.
 */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex', className)}>
      <Loader2 className={cn('animate-spin text-current', SIZES[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
