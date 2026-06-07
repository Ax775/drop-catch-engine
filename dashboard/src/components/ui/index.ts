/**
 * Drop Catch UI kit — reusable, accessible primitives.
 *
 * Import from a single entry point:
 *   import { Button, Input, Modal, Badge } from '@/components/ui';
 */
export { cn } from './utils/cn';

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { Card } from './Card';
export type { CardProps, CardSectionProps } from './Card';

export { Alert } from './Alert';
export type { AlertProps, AlertVariant } from './Alert';

export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';

export { Skeleton, SkeletonText } from './Skeleton';
export type { SkeletonProps, SkeletonTextProps } from './Skeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { ToastProvider, useToast } from './Toast';
export type { ToastOptions, ToastVariant } from './Toast';

export { Tabs } from './Tabs';
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsPanelProps,
} from './Tabs';
