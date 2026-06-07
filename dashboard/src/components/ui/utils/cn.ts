import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose class names with conditional logic (clsx) and resolve conflicting
 * Tailwind utilities (tailwind-merge), so consumer overrides always win:
 *
 *   cn('px-4 bg-emerald-600', condition && 'opacity-50', props.className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
