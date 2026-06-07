import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  hideLabel?: boolean;
  options: SelectOption[];
  /** Optional leading placeholder option (rendered disabled when value is ''). */
  placeholder?: string;
}

const labelClass = 'mb-1.5 block text-sm font-medium text-content-muted';

/**
 * Labelled native <select> — keyboard accessible by default, modern styling and
 * the same error/helper wiring as Input. The chevron is decorative.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    helperText,
    hideLabel = false,
    options,
    placeholder,
    id,
    required,
    disabled,
    className,
    ...props
  },
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

      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            'h-9 w-full appearance-none rounded-lg border bg-surface-raised pl-3 pr-9 text-sm text-content',
            'outline-none transition-colors focus:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-negative/60 focus:border-negative focus:ring-negative/25'
              : 'border-line focus:border-accent/70 focus:ring-accent/25',
            className,
          )}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle"
          aria-hidden="true"
        />
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
