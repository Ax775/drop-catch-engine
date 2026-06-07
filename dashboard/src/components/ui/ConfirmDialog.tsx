import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  /** Extra body content above the action buttons. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders a red confirm button for destructive actions. */
  variant?: 'default' | 'danger';
  /** Shows a spinner on confirm and blocks dismissal while pending. */
  isLoading?: boolean;
}

/**
 * Lightweight confirmation dialog built on the accessible Modal primitive.
 * Inherits focus trap, scroll lock, focus restore, and Escape handling.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      disableBackdropClose={isLoading}
      disableEscapeClose={isLoading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children ?? (description && <p className="text-sm text-content-muted">{description}</p>)}
    </Modal>
  );
}
