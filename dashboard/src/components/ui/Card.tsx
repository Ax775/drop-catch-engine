import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Subtle border lift + shadow on hover for interactive cards. */
  interactive?: boolean;
}

/**
 * Surface container — elevated panel with a hairline border (modern dark).
 * Composable with Card.Header / Card.Body / Card.Footer below.
 */
export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface',
        interactive &&
          'transition-colors hover:border-line-strong hover:bg-surface-hover/40',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardHeader({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('border-b border-line px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold tracking-tight text-content', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-0.5 text-sm text-content-muted', className)} {...props}>
      {children}
    </p>
  );
}

function CardBody({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('px-5 py-5', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-line px-5 py-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
