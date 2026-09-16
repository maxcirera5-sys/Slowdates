'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationSheet } from '@/components/ui/sheet';
import { DateOptionCard } from '@/components/ui/date-option-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { venueById } from '@/data/venues';
import type { DateFeedback, TimeOption } from '@/lib/types';
import { ageFromDob, formatDate, formatTime } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

function upcomingSlots(): TimeOption[] {
  const out: TimeOption[] = [];
  const hours = [13, 20];
  for (let d = 2; d <= 8 && out.length < 6; d++) {
    for (const h of hours) {
      if (out.length >= 6) break;
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(h, 0, 0, 0);
      out.push({ id: `${d}-${h}`, start: date.toISOString(), durationMins: h < 17 ? 90 : 120 });
    }
  }
  return out;
}

export default function DateDetailPage() {
  const router = useRouter();
  const { dateId } = useParams<{ dateId: string }>();
  const me = useDemoStore((s) => s.me);
  const candidates = useDemoStore((s) => s.candidates);
  const proposals = useDemoStore((s) => s.proposals);
  const proposeTimes = useDemoStore((s) => s.proposeTimes);
  const respondToTimes = useDemoStore((s) => s.respondToTimes);
  const confirmVenue = useDemoStore((s) => s.confirmVenue);
  const cancelDate = useDemoStore((s) => s.cancelDate);
  const completeDate = useDemoStore((s) => s.completeDate);
  const submitFeedback = useDemoStore((s) => s.submitFeedback);

  const proposal = proposals.find((p) => p.id === dateId);
  const candidate = candidates.find((c) => c.id === proposal?.candidateId);

  const slots = useMemo(upcomingSlots, []);
  const [picked, setPicked] = useState<string[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!me || !proposal || !candidate) {
    return (
      <EmptyState
        title="Date not found"
        action={
          <Button variant="secondary" onClick={() => router.push('/app/dates')}>
            Back to dates
          </Button>
        }
      />
    );
  }

  const primary = candidate.photos.find((p) => p.isPrimary) ?? candidate.photos[0];
  const venue = proposal.venueId ? venueById(proposal.venueId) : undefined;

  function togglePick(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 3 ? [...cur, id] : cur));
  }
  function sendTimes(action: 'propose' | 'counter') {
    const chosen = slots.filter((s) => picked.includes(s.id));
    if (action === 'propose') proposeTimes(proposal!.id, chosen, 'me');
    else respondToTimes(proposal!.id, 'counter', chosen);
    setPicked([]);
  }

  return (
    <div className="animate-fade-in space-y-5 pb-4">
      <button
        onClick={() => router.push('/app/dates')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Dates
      </button>

      <div className="flex items-center gap-3">
        <ProfileAvatar name={candidate.displayName} src={primary?.url} size="lg" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {candidate.displayName}, {ageFromDob(candidate.dob)}
          </h1>
          <p className="text-sm text-muted-foreground">{candidate.profession}</p>
          <div className="mt-1">
            <StatusBadge state={proposal.state} />
          </div>
        </div>
      </div>

      {/* State-specific panel */}
      {proposal.state === 'mutual_interest' ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="text-sm font-semibold">It’s a match — propose up to 3 times</h2>
            <p className="text-xs text-muted-foreground">
              You can start scheduling. Pick a few options that work for you ({picked.length}/3).
            </p>
            <div className="space-y-2">
              {slots.map((s) => (
                <DateOptionCard key={s.id} option={s} selected={picked.includes(s.id)} onSelect={() => togglePick(s.id)} />
              ))}
            </div>
            <Button size="block" disabled={picked.length === 0} onClick={() => sendTimes('propose')}>
              Send {picked.length || ''} option{picked.length === 1 ? '' : 's'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {proposal.state === 'awaiting_time_response' && proposal.timeProposedBy === 'them' ? (
        <ReceiverPanel
          options={proposal.timeOptions}
          name={candidate.displayName}
          onAccept={(opt) => respondToTimes(proposal.id, 'accept', opt)}
          onDecline={() => respondToTimes(proposal.id, 'decline')}
          slots={slots}
          picked={picked}
          togglePick={togglePick}
          onCounter={() => sendTimes('counter')}
        />
      ) : null}

      {proposal.state === 'awaiting_time_response' && proposal.timeProposedBy === 'me' ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="text-sm font-semibold">Waiting for {candidate.displayName}</h2>
            <p className="text-xs text-muted-foreground">
              You proposed {proposal.timeOptions.length} times. We’ll notify you when they respond.
            </p>
            <div className="space-y-2">
              {proposal.timeOptions.map((o) => (
                <DateOptionCard key={o.id} option={o} as="div" />
              ))}
            </div>
            {/* Demo helper to advance the simulated other side. */}
            <Button
              variant="secondary"
              size="block"
              onClick={() => respondToTimes(proposal.id, 'accept', proposal.timeOptions[0])}
            >
              <Sparkles className="h-4 w-4" /> Simulate {candidate.displayName}’s reply
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {proposal.state === 'selecting_venue' ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="text-sm font-semibold">A time is set 🎉</h2>
            {proposal.selectedTime ? (
              <DateOptionCard option={proposal.selectedTime} as="div" />
            ) : null}
            <p className="text-xs text-muted-foreground">
              Now BOND finds a venue that suits you both — balanced travel, first-date atmosphere and
              your shared favourites.
            </p>
            <Button size="block" onClick={() => confirmVenue(proposal.id)}>
              <MapPin className="h-4 w-4" /> See BOND’s venue suggestion
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {proposal.state === 'confirmed' && venue ? (
        <>
          <Card className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={venue.image} alt={venue.name} className="h-40 w-full object-cover" />
            <CardContent className="space-y-3 pt-4">
              <div>
                <h2 className="text-lg font-bold">{venue.name}</h2>
                <p className="text-sm capitalize text-muted-foreground">
                  {venue.category.replace('_', ' ')} · {venue.address}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoTile icon={<Clock className="h-4 w-4" />} label="When">
                  {proposal.selectedTime ? (
                    <>
                      {formatDate(proposal.selectedTime.start)}
                      <br />
                      {formatTime(proposal.selectedTime.start)}
                    </>
                  ) : null}
                </InfoTile>
                <InfoTile icon={<MapPin className="h-4 w-4" />} label="Meeting point">
                  {proposal.meetingPoint}
                </InfoTile>
              </div>

              {/* Mock map preview */}
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_30%_30%,rgba(124,77,255,0.25),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(192,132,252,0.2),transparent_55%)]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:24px_24px]" />
                <MapPin className="relative h-8 w-8 text-primary-light drop-shadow" aria-hidden />
                <span className="sr-only">Map preview of {venue.address}</span>
              </div>

              <div className="rounded-lg bg-primary/10 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-primary-light">
                  <Sparkles className="h-3.5 w-3.5" /> Why BOND chose this
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{proposal.venueReason}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Availability requires confirmation — BOND doesn’t book a table for you in the MVP.
              </p>

              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="block" onClick={() => alert('Calendar export is a placeholder in the MVP.')}>
                  <CalendarPlus className="h-4 w-4" /> Add to calendar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(true)}>
                    Cancel date
                  </Button>
                  <Button className="flex-1" onClick={() => completeDate(proposal.id)}>
                    Mark as done
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              Safety first: meet in public, tell a friend your plans, and arrange your own transport.
              See our <a href="/safety" className="underline">safety tips</a>.
            </span>
          </div>
        </>
      ) : null}

      {proposal.state === 'completed' ? (
        <FeedbackPanel
          existing={proposal.feedback}
          name={candidate.displayName}
          onSubmit={(fb) => submitFeedback(proposal.id, fb)}
        />
      ) : null}

      {(['cancelled', 'declined', 'expired'] as const).includes(
        proposal.state as 'cancelled' | 'declined' | 'expired',
      ) ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            This connection is no longer active.
          </CardContent>
        </Card>
      ) : null}

      {/* Timeline */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Activity</h2>
          <ol className="space-y-3">
            {proposal.timeline.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {i < proposal.timeline.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
                </div>
                <div className="pb-1">
                  <p className="text-sm">{ev.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(ev.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <ConfirmationSheet
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this date?"
        description="We’ll let them know a change came up. You can always reconnect later."
        confirmLabel="Cancel date"
        destructive
        onConfirm={() => cancelDate(proposal.id)}
      />
    </div>
  );
}

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-elevated p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 font-semibold leading-snug">{children}</p>
    </div>
  );
}

function ReceiverPanel({
  options,
  name,
  onAccept,
  onDecline,
  slots,
  picked,
  togglePick,
  onCounter,
}: {
  options: TimeOption[];
  name: string;
  onAccept: (opt: TimeOption) => void;
  onDecline: () => void;
  slots: TimeOption[];
  picked: string[];
  togglePick: (id: string) => void;
  onCounter: () => void;
}) {
  const [mode, setMode] = useState<'choose' | 'counter'>('choose');
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <h2 className="text-sm font-semibold">{name} is interested and proposed times</h2>
        {mode === 'choose' ? (
          <>
            <p className="text-xs text-muted-foreground">Pick one that works, or suggest your own.</p>
            <div className="space-y-2">
              {options.map((o) => (
                <DateOptionCard key={o.id} option={o} selected={selected === o.id} onSelect={() => setSelected(o.id)} />
              ))}
            </div>
            <Button
              size="block"
              disabled={!selected}
              onClick={() => {
                const opt = options.find((o) => o.id === selected);
                if (opt) onAccept(opt);
              }}
            >
              Accept this time
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode('counter')}>
                Suggest alternatives
              </Button>
              <Button variant="ghost" className="flex-1" onClick={onDecline}>
                Decline
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Propose up to 3 alternatives ({picked.length}/3).</p>
            <div className="space-y-2">
              {slots.map((s) => (
                <DateOptionCard key={s.id} option={s} selected={picked.includes(s.id)} onSelect={() => togglePick(s.id)} />
              ))}
            </div>
            <Button size="block" disabled={picked.length === 0} onClick={onCounter}>
              Send alternatives
            </Button>
            <Button variant="ghost" size="block" onClick={() => setMode('choose')}>
              Back
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackPanel({
  existing,
  name,
  onSubmit,
}: {
  existing?: DateFeedback;
  name: string;
  onSubmit: (fb: DateFeedback) => void;
}) {
  const [matched, setMatched] = useState<DateFeedback['matchedProfile']>(existing?.matchedProfile ?? 'yes');
  const [again, setAgain] = useState<DateFeedback['meetAgain']>(existing?.meetAgain ?? 'yes');
  const [venueOk, setVenueOk] = useState(existing?.venueSuitable ?? true);
  const [safe, setSafe] = useState(existing?.feltSafe ?? true);
  const [note, setNote] = useState(existing?.note ?? '');
  const [done, setDone] = useState(Boolean(existing));

  if (done) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Thanks — your private feedback helps BOND improve future matches. It’s never shared with {name}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <h2 className="text-sm font-semibold">How was your date? (private)</h2>
        <Choice
          label={`Did ${name} match their profile?`}
          value={matched}
          onChange={setMatched}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'somewhat', label: 'Somewhat' },
            { value: 'no', label: 'No' },
          ]}
        />
        <Choice
          label="Would you like to meet again?"
          value={again}
          onChange={setAgain}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'maybe', label: 'Maybe' },
            { value: 'no', label: 'No' },
          ]}
        />
        <Choice
          label="Was the venue suitable?"
          value={venueOk ? 'yes' : 'no'}
          onChange={(v) => setVenueOk(v === 'yes')}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
        <Choice
          label="Did you feel safe?"
          value={safe ? 'yes' : 'no'}
          onChange={(v) => setSafe(v === 'yes')}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional private note…"
          rows={3}
          className="w-full rounded-md border border-input bg-elevated px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          size="block"
          onClick={() => {
            onSubmit({ matchedProfile: matched, meetAgain: again, venueSuitable: venueOk, feltSafe: safe, note });
            setDone(true);
          }}
        >
          Submit feedback
        </Button>
      </CardContent>
    </Card>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={
              value === o.value
                ? 'flex-1 rounded-full bg-brand-gradient px-3 py-2 text-sm font-semibold text-primary-foreground'
                : 'flex-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground'
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
