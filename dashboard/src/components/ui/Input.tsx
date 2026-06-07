import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Error message; when set, the field is marked invalid (aria-invalid). */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  helperText?: string;
  /** Adornment rendered inside the field on the left (e.g. an icon). */
  leftIcon?: ReactNode;
  /** Adornment rendered inside the field on the right. */
  rightIcon?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
}

const labelClass = 'mb-1.5 block text-sm font-medium text-content-muted';

/**
 * Labelled text input — modern dark styling with accessible error/helper wiring.
 * - label associated via htmlFor/id.
 * - error/helper linked through aria-describedby; error sets aria-invalid.
 * - required fields get a visible marker plus aria-required.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    hideLabel = false,
    id,
    required,
    disabled,
    className,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy =
    [error ? errorId : null, !error && helperText ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={cn(labelClass, hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="ml-0.5 text-negative" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            'h-9 w-full rounded-lg border bg-surface-raised text-sm text-content placeholder:text-content-subtle',
            'outline-none transition-colors focus:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon ? 'pl-9' : 'pl-3',
            rightIcon ? 'pr-9' : 'pr-3',
            error
              ? 'border-negative/60 focus:border-negative focus:ring-negative/25'
              : 'border-line focus:border-accent/70 focus:ring-accent/25',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-negative">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-content-subtle">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
