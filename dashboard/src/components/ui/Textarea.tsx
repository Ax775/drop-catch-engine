import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from './utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  hideLabel?: boolean;
}

const labelClass = 'mb-1.5 block text-sm font-medium text-content-muted';

/**
 * Labelled multi-line text field; accessible error/helper wiring identical to Input.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, hideLabel = false, id, required, disabled, className, rows = 4, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy =
    [error ? errorId : null, !error && helperText ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className={cn(labelClass, hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="ml-0.5 text-negative" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border bg-surface-raised px-3 py-2.5 text-sm text-content placeholder:text-content-subtle',
          'resize-y outline-none transition-colors focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-negative/60 focus:border-negative focus:ring-negative/25'
            : 'border-line focus:border-accent/70 focus:ring-accent/25',
          className,
        )}
        {...props}
      />

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
