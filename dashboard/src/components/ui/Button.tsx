import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover focus-visible:ring-accent',
  secondary:
    'bg-surface-raised text-content border border-line hover:bg-surface-hover focus-visible:ring-accent',
  outline:
    'border border-line text-content hover:bg-surface-raised focus-visible:ring-accent',
  ghost: 'text-content-muted hover:bg-surface-raised hover:text-content focus-visible:ring-accent',
  danger: 'bg-negative text-white hover:brightness-110 focus-visible:ring-negative',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy, and blocks interaction. */
  isLoading?: boolean;
  /** Text shown next to the spinner while loading (visual only). */
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
}

/**
 * Accessible button — modern, sleek styling: soft radii, medium weight,
 * refined violet accent.
 * - Native <button> semantics (keyboard + screen-reader friendly).
 * - focus-visible ring, disabled + loading states, icon slots.
 * - Loading sets aria-busy and disables the control to prevent double submit.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  const spinnerSize = size === 'lg' ? 'md' : 'sm';

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size={spinnerSize} label={loadingText ?? 'Loading'} />
          {size !== 'icon' && (loadingText ?? children)}
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="inline-flex shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {size !== 'icon' ? children : <span aria-hidden="true">{children}</span>}
          {rightIcon && (
            <span className="inline-flex shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});
