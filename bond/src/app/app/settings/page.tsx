'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  LogOut,
  PauseCircle,
  ShieldCheck,
  Trash2,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationSheet } from '@/components/ui/sheet';
import { candidateById, useDemoStore } from '@/store/demo-store';

export default function SettingsPage() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const blockedIds = useDemoStore((s) => s.blockedIds);
  const toggleDiscoveryPause = useDemoStore((s) => s.toggleDiscoveryPause);
  const signOut = useDemoStore((s) => s.signOut);

  const [notifications, setNotifications] = useState({ proposals: true, dates: true, safety: true });
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!me) return null;

  return (
    <div className="animate-fade-in space-y-5">
      <button
        onClick={() => router.push('/app/profile')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </button>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Account */}
      <Group title="Account">
        <Row label="Signed in as" value={me.isDemo ? 'Demo profile' : me.displayName} />
        <Row label="City" value={me.city || '—'} />
      </Group>

      {/* Discovery */}
      <Group title="Discovery">
        <ToggleRow
          icon={<PauseCircle className="h-5 w-5" />}
          label="Pause discovery"
          description="Stop receiving new proposals. Existing dates are unaffected."
          checked={me.discoveryPaused}
          onChange={toggleDiscoveryPause}
        />
      </Group>

      {/* Notifications */}
      <Group title="Notifications">
        <ToggleRow
          icon={<Bell className="h-5 w-5" />}
          label="New proposals"
          checked={notifications.proposals}
          onChange={() => setNotifications((n) => ({ ...n, proposals: !n.proposals }))}
        />
        <ToggleRow
          icon={<Bell className="h-5 w-5" />}
          label="Date updates"
          checked={notifications.dates}
          onChange={() => setNotifications((n) => ({ ...n, dates: !n.dates }))}
        />
        <ToggleRow
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Safety reminders"
          checked={notifications.safety}
          onChange={() => setNotifications((n) => ({ ...n, safety: !n.safety }))}
        />
      </Group>

      {/* Privacy & safety */}
      <Group title="Privacy & safety">
        <LinkRow label="Privacy policy" href="/privacy" />
        <LinkRow label="Safety tips" href="/safety" />
        <LinkRow label="Terms of use" href="/terms" />
      </Group>

      {/* Blocked users */}
      <Group title="Blocked users">
        {blockedIds.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">You haven’t blocked anyone.</p>
        ) : (
          <ul>
            {blockedIds.map((id) => (
              <li key={id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <UserX className="h-4 w-4 text-muted-foreground" />
                {candidateById(id)?.displayName ?? id}
              </li>
            ))}
          </ul>
        )}
      </Group>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" size="block" onClick={() => { signOut(); router.push('/'); }}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
        <Button variant="destructive" size="block" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete account
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Account deletion runs through a server-side flow. Fully erasing storage records requires a
        privileged (service-role) step, documented in the README.
      </p>

      <ConfirmationSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This permanently removes your profile, answers and matches. This can’t be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => { signOut(); router.push('/'); }}
      />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <Card>
        <CardContent className="divide-y divide-border p-0">{children}</CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-elevated">
      <span>{label}</span>
      <span aria-hidden className="text-muted-foreground">
        ›
      </span>
    </a>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-6 w-6 accent-primary" />
    </label>
  );
}
