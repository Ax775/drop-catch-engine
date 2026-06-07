import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { cn } from './utils/cn';

interface TabsContextValue {
  baseId: string;
  value: string;
  onChange: (id: string) => void;
  tabId: (id: string) => string;
  panelId: (id: string) => string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <Tabs>`);
  }
  return ctx;
}

export interface TabsProps {
  value: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible tabs following the WAI-ARIA pattern, as a compound component so
 * the tablist and panels share consistent ids:
 *
 *   <Tabs value={tab} onChange={setTab}>
 *     <Tabs.List aria-label="Sections">
 *       <Tabs.Trigger id="a">A</Tabs.Trigger>
 *       <Tabs.Trigger id="b">B</Tabs.Trigger>
 *     </Tabs.List>
 *     <Tabs.Panel id="a">…</Tabs.Panel>
 *     <Tabs.Panel id="b">…</Tabs.Panel>
 *   </Tabs>
 */
export function Tabs({ value, onChange, children, className }: TabsProps) {
  const baseId = useId();
  const ctx: TabsContextValue = {
    baseId,
    value,
    onChange,
    tabId: (id) => `${baseId}-tab-${id}`,
    panelId: (id) => `${baseId}-panel-${id}`,
  };
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
  'aria-label': string;
}

function TabsList({ children, className, ...rest }: TabsListProps) {
  const { value, onChange } = useTabsContext('Tabs.List');
  const listRef = useRef<HTMLDivElement>(null);

  // Roving keyboard navigation across the (enabled) triggers.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(e.key)) return;

      const node = listRef.current;
      if (!node) return;
      const triggers = Array.from(
        node.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
      );
      if (triggers.length === 0) return;

      const ids = triggers.map((t) => t.dataset.tabId ?? '');
      const currentIndex = ids.indexOf(value);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % triggers.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = triggers.length - 1;
          break;
      }
      e.preventDefault();
      const nextId = ids[nextIndex];
      if (nextId) {
        onChange(nextId);
        triggers[nextIndex].focus();
      }
    },
    [value, onChange],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex gap-1 rounded-xl border border-line bg-surface p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

function TabsTrigger({ id, children, disabled = false, className }: TabsTriggerProps) {
  const { value, onChange, tabId, panelId } = useTabsContext('Tabs.Trigger');
  const selected = value === id;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(id)}
      data-tab-id={id}
      aria-selected={selected}
      aria-controls={panelId(id)}
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && onChange(id)}
      className={cn(
        'rounded-lg px-3.5 py-1.5 text-sm font-medium outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'bg-surface-hover text-content shadow-sm'
          : 'text-content-muted hover:text-content',
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

function TabsPanel({ id, children, className }: TabsPanelProps) {
  const { value, tabId, panelId } = useTabsContext('Tabs.Panel');
  if (value !== id) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(id)}
      aria-labelledby={tabId(id)}
      tabIndex={0}
      className={cn(
        'outline-none animate-fade-in focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
    >
      {children}
    </div>
  );
}

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;
