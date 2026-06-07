import { useState } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  Tabs,
  Textarea,
  ToastProvider,
  useToast,
} from './index';

/**
 * Living gallery / "kitchen sink" for the UI kit. Renders every primitive in
 * its key states so changes can be reviewed visually. Not part of the app
 * routes — mount it standalone (e.g. swap into main.tsx during review).
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-content-subtle">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

/** Self-contained so the toast demo works even when mounted standalone. */
export default function Showcase() {
  return (
    <ToastProvider>
      <ShowcaseInner />
    </ToastProvider>
  );
}

function ShowcaseInner() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [email, setEmail] = useState('not-an-email');
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-content">UI Kit · Kitchen Sink</h1>
          <p className="mt-1 text-sm text-content-muted">
            Every primitive, every key state — loading, empty, error, disabled.
          </p>
        </header>

        <Section title="Buttons">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
            Delete
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add</Button>
          <Button isLoading loadingText="Saving…">
            Save
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </Section>

        <Section title="Form controls">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Input label="Domain" placeholder="example.com" required leftIcon={<Globe className="h-4 w-4" />} />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={email.includes('@') ? undefined : 'Enter a valid email address'}
            />
            <Select
              label="Status"
              placeholder="Choose…"
              defaultValue=""
              options={[
                { value: 'scanned', label: 'Scanned' },
                { value: 'high_value', label: 'High Value' },
                { value: 'deployed', label: 'Deployed' },
              ]}
            />
            <Input label="Disabled" value="read only" disabled helperText="This field is locked" />
            <div className="sm:col-span-2">
              <Textarea label="Notes" helperText="Optional internal notes" placeholder="Add context…" />
            </div>
          </div>
        </Section>

        <Section title="Badges">
          <Badge variant="neutral">Scanned</Badge>
          <Badge variant="success" dot>
            High Value
          </Badge>
          <Badge variant="info">Deployed</Badge>
          <Badge variant="muted">Archived</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Failed</Badge>
          <Badge variant="success" pulse>
            Live
          </Badge>
        </Section>

        <Section title="Alerts">
          <div className="w-full space-y-3">
            <Alert variant="info" title="Heads up">
              The SEO scoring queue runs asynchronously.
            </Alert>
            <Alert variant="success">Domain deployed successfully.</Alert>
            <Alert variant="warning" title="Warning">
              Deploying registers this domain as an active asset.
            </Alert>
            <Alert
              variant="error"
              title="Request failed"
              action={
                <Button size="sm" variant="outline">
                  Retry
                </Button>
              }
            >
              Could not load domains.
            </Alert>
          </div>
        </Section>

        <Section title="Loading states">
          <div className="w-full space-y-4">
            <div className="flex items-center gap-4 text-slate-300">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <Card>
              <Card.Body className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <SkeletonText lines={3} />
              </Card.Body>
            </Card>
          </div>
        </Section>

        <Section title="Empty state">
          <Card className="w-full">
            <EmptyState
              title="No domains found"
              description="Try adjusting your filters, or ingest new domains to get started."
              action={<Button leftIcon={<Plus className="h-4 w-4" />}>Ingest domains</Button>}
            />
          </Card>
        </Section>

        <Section title="Card (compound)">
          <Card interactive className="w-full max-w-sm">
            <Card.Header>
              <Card.Title>Acquisition</Card.Title>
              <Card.Description>Cost vs. estimated market value</Card.Description>
            </Card.Header>
            <Card.Body>
              <p className="text-3xl font-bold text-emerald-400">€1,240</p>
              <p className="text-sm text-slate-400">Estimated value</p>
            </Card.Body>
            <Card.Footer>
              <Button variant="ghost">Dismiss</Button>
              <Button>Deploy</Button>
            </Card.Footer>
          </Card>
        </Section>

        <Section title="Tabs (keyboard: ←/→, Home/End)">
          <div className="w-full">
            <Tabs value={tab} onChange={setTab}>
              <Tabs.List aria-label="Demo sections">
                <Tabs.Trigger id="overview">Overview</Tabs.Trigger>
                <Tabs.Trigger id="metrics">Metrics</Tabs.Trigger>
                <Tabs.Trigger id="disabled" disabled>
                  Disabled
                </Tabs.Trigger>
              </Tabs.List>
              <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm text-content-muted">
                <Tabs.Panel id="overview">Overview panel content.</Tabs.Panel>
                <Tabs.Panel id="metrics">Metrics panel content.</Tabs.Panel>
              </div>
            </Tabs>
          </div>
        </Section>

        <Section title="Modal (focus trap + Esc + scroll lock)">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Deploy asset"
            description="This will register the domain as an active asset."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirm deploy</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Input label="Confirmation note" placeholder="Optional note…" />
              <Alert variant="warning">This action cannot be undone automatically.</Alert>
            </div>
          </Modal>
        </Section>

        <Section title="Confirm dialog">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Archive…
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              toast({ title: 'Domain archived', description: 'example.com', variant: 'success' });
            }}
            title="Archive domain?"
            description="“example.com” will be moved to Archived. You can still find it via the status filter."
            confirmLabel="Archive"
            variant="danger"
          />
        </Section>

        <Section title="Toasts">
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: 'Saved', description: 'Your changes were saved.', variant: 'success' })
            }
          >
            Success
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: 'Something went wrong', variant: 'error' })}
          >
            Error
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Domain archived',
                description: 'example.com',
                variant: 'success',
                action: {
                  label: 'Undo',
                  onClick: () => toast({ title: 'Archive undone', variant: 'info' }),
                },
              })
            }
          >
            With Undo action
          </Button>
        </Section>
      </div>
    </div>
  );
}
