# UI Kit

Reusable, accessible primitives for the Drop Catch dashboard. Built on React 18
+ Tailwind, dark slate theme. Every component is keyboard- and screen-reader
friendly, handles loading/empty/error/edge states, and is responsive by default.

```tsx
import { Button, Input, Modal, Badge, Card, Tabs } from '@/components/ui';
// (or relative: '../components/ui')
```

## Conventions

- **`className` always wins.** Components compose classes with `cn()`
  (clsx + tailwind-merge), so passing `className` overrides internal styles
  cleanly — e.g. `<Button className="w-full rounded-none" />`.
- **`forwardRef`** on all form controls (`Button`, `Input`, `Textarea`,
  `Select`) so they work with focus management and form libraries.
- **Auto-wired a11y.** Labels, `aria-describedby`, `aria-invalid`, and ids are
  generated with `useId()` — you only pass `label`, `error`, `helperText`.

---

## Button

```tsx
<Button>Save</Button>
<Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
<Button isLoading loadingText="Saving…">Save</Button>
<Button variant="ghost" size="icon" aria-label="Close"><X className="h-4 w-4" /></Button>
```

Variants: `primary | secondary | outline | ghost | danger`. Sizes:
`sm | md | lg | icon`. `isLoading` shows a spinner, sets `aria-busy`, and blocks
clicks to prevent double-submit.

## Input / Textarea / Select

```tsx
<Input label="Domain" placeholder="example.com" required
       leftIcon={<Globe className="h-4 w-4" />} />

<Input label="Email" type="email" error="Enter a valid email" />

<Select label="Status" placeholder="Choose…" value={s} onChange={…}
        options={[{ value: 'scanned', label: 'Scanned' }]} />

<Textarea label="Notes" helperText="Optional internal notes" rows={5} />
```

Error state sets `aria-invalid`, renders `role="alert"`, and links the message
via `aria-describedby`. Helper text shows only when there is no error.

## Badge

```tsx
<Badge variant="success" dot>High Value</Badge>
<Badge variant="info">Deployed</Badge>
<Badge variant="success" pulse>Live</Badge>
```

Variants: `neutral | success | warning | danger | info | muted`.

## Card (compound)

```tsx
<Card interactive>
  <Card.Header>
    <Card.Title>Acquisition</Card.Title>
    <Card.Description>Cost vs. estimated value</Card.Description>
  </Card.Header>
  <Card.Body>…</Card.Body>
  <Card.Footer>
    <Button variant="ghost">Cancel</Button>
    <Button>Confirm</Button>
  </Card.Footer>
</Card>
```

## Alert

```tsx
<Alert variant="warning" title="Heads up">Deploying registers this as an asset.</Alert>
<Alert variant="error" action={<Button size="sm" onClick={retry}>Retry</Button>}>
  Failed to load domains.
</Alert>
```

`warning`/`error` use `role="alert"` (assertive); `info`/`success` use
`role="status"` (polite).

## Spinner / Skeleton / EmptyState — state handling

```tsx
// Loading
{isLoading && <Spinner label="Loading domains" />}
{isLoading && <SkeletonText lines={4} />}
{isLoading && <Skeleton className="h-10 w-full" />}

// Empty / zero-data
{!isLoading && items.length === 0 && (
  <EmptyState
    icon={Inbox}
    title="No domains found"
    description="Try adjusting filters or ingest new domains."
    action={<Button onClick={openIngest}>Ingest domains</Button>}
  />
)}
```

## Modal

```tsx
const [open, setOpen] = useState(false);

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Deploy asset"
  description="This will register the domain as active."
  footer={
    <>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={confirm}>Confirm</Button>
    </>
  }
>
  …body…
</Modal>
```

Portals to `document.body`. Traps Tab focus, restores focus to the trigger on
close, locks background scroll, closes on Escape / backdrop click (both
independently disableable). Labelled by title, described by description.

## Tabs (compound, ARIA pattern)

```tsx
const [tab, setTab] = useState('domains');

<Tabs value={tab} onChange={setTab}>
  <Tabs.List aria-label="Dashboard sections">
    <Tabs.Trigger id="domains">Domains</Tabs.Trigger>
    <Tabs.Trigger id="roi">ROI</Tabs.Trigger>
    <Tabs.Trigger id="logs">Logs</Tabs.Trigger>
  </Tabs.List>

  <div className="mt-6">
    <Tabs.Panel id="domains">…</Tabs.Panel>
    <Tabs.Panel id="roi">…</Tabs.Panel>
    <Tabs.Panel id="logs">…</Tabs.Panel>
  </div>
</Tabs>
```

Roving tabindex; ArrowLeft/Right/Up/Down (wrapping) + Home/End move selection.
Triggers and panels are linked via `aria-controls` / `aria-labelledby`.

## ConfirmDialog

A small confirmation dialog built on `Modal` — inherits the focus trap, scroll
lock, focus restore, and Escape handling.

```tsx
const [open, setOpen] = useState(false);
const [busy, setBusy] = useState(false);

<ConfirmDialog
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={handleDelete}
  title="Archive domain?"
  description="“example.com” will be moved to Archived. You can still find it via the status filter."
  confirmLabel="Archive"
  variant="danger"   // red confirm button for destructive actions
  isLoading={busy}   // spinner on confirm + blocks dismissal while pending
/>
```

Pass `children` for a richer body; otherwise `description` renders as the body.

## Toasts — ToastProvider + useToast

Mount `<ToastProvider>` once near the app root, then dispatch from anywhere.

```tsx
// main.tsx
import { ToastProvider } from '@/components/ui';

<ToastProvider>
  <App />
</ToastProvider>
```

```tsx
// anywhere inside the tree
import { useToast } from '@/components/ui';

const { toast } = useToast();

toast({ title: 'Domain deployed', description: 'example.com', variant: 'success' });
toast({ title: 'Request failed', description: 'Try again', variant: 'error' });

// with an inline action (auto-dismisses the toast when clicked)
toast({
  title: 'Domain archived',
  description: 'example.com',
  variant: 'success',
  action: { label: 'Undo', onClick: () => restore(domain) },
});
```

Toasts stack bottom-right, auto-dismiss (4.5s; 6s for errors; override with
`duration`), and are dismissible by the close button. They announce to
assistive tech: `role="alert"` (assertive) for `error`/`warning`, `role="status"`
(polite) for `success`/`info`. Variants: `success | error | info | warning`.
