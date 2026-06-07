import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './utils/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Defaults to 4500 (6000 for error). */
  duration?: number;
  /** Optional inline action (e.g. "Undo"). Dismisses the toast when clicked. */
  action?: ToastAction;
}

interface ToastRecord {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Access the toast dispatcher. Must be used within <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-positive',
  error: 'text-negative',
  info: 'text-accent',
  warning: 'text-warn',
};

/**
 * Toast notification provider. Wrap the app once; call `toast()` from anywhere
 * via useToast(). Notifications stack bottom-right, auto-dismiss, and are
 * announced to assistive tech (assertive for error/warning, polite otherwise).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    idRef.current += 1;
    const variant = opts.variant ?? 'info';
    const record: ToastRecord = {
      id: idRef.current,
      title: opts.title,
      description: opts.description,
      variant,
      duration: opts.duration ?? (variant === 'error' ? 6000 : 4500),
      action: opts.action,
    };
    setToasts((list) => [...list, record]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const Icon = ICON[toast.variant];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_COLOR[toast.variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-content">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-content-muted">{toast.description}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 rounded-md text-sm font-semibold text-accent outline-none transition-colors hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 rounded-md p-1 text-content-subtle outline-none transition-colors hover:bg-surface-hover hover:text-content focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
