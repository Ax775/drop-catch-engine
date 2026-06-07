import { useEffect, useState } from 'react';
import { formatAbsolute, formatRelative } from '../lib/time';

interface RelativeTimeProps {
  value: string | number | Date;
  /** Extra classes for the rendered <time> element. */
  className?: string;
}

/**
 * Renders a terse relative timestamp ("2u ago") that re-renders once a minute,
 * with the full absolute time available on hover via the native title tooltip.
 */
export default function RelativeTime({ value, className }: RelativeTimeProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className={className} title={formatAbsolute(value)}>
      {formatRelative(value)}
    </time>
  );
}
