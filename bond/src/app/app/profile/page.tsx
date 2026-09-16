'use client';

import Link from 'next/link';
import { CheckCircle2, Pencil, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { venueById } from '@/data/venues';
import { ageFromDob } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const INTENTION_LABEL: Record<string, string> = {
  long_term: 'Long-term relationship',
  long_term_open_to_short: 'Long-term, open',
  short_term_open_to_long: 'Short-term, open to more',
  friends_first: 'Friends first',
  still_figuring_out: 'Still figuring it out',
};

export default function ProfilePage() {
  const me = useDemoStore((s) => s.me);
  if (!me) return null;

  const favourites = me.favouriteVenueIds.map((id) => venueById(id)).filter(Boolean);

  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader
        title="Your profile"
        action={
          <Link
            href="/app/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-elevated hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        }
      />

      {me.photos.length ? (
        <div className="grid grid-cols-3 gap-2">
          {me.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="aspect-[3/4] w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : null}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {me.displayName || 'Your name'}
          {me.dob ? `, ${ageFromDob(me.dob)}` : ''}
        </h2>
        <p className="text-muted-foreground">
          {me.profession}
          {me.city ? ` · ${me.city}` : ''}
        </p>
      </div>

      {me.intro ? <p className="text-sm leading-relaxed text-muted-foreground">{me.intro}</p> : null}

      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-primary-light">
              {me.onboardingComplete ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold">
                {me.onboardingComplete ? 'Profile complete' : 'Profile in progress'}
              </p>
              <p className="text-xs text-muted-foreground">
                {me.aiProfile ? 'AI profile generated' : 'AI profile pending'}
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/ai-profile">View AI profile</Link>
          </Button>
        </CardContent>
      </Card>

      <Section title="Interests">
        {me.interests.length ? (
          <div className="flex flex-wrap gap-2">
            {me.interests.map((i) => (
              <span key={i} className="rounded-full bg-elevated px-3 py-1 text-xs">
                {i}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add interests to help BOND match you.</p>
        )}
      </Section>

      <Section title="Favourite venues">
        {favourites.length ? (
          <ul className="space-y-2">
            {favourites.map((v) => (
              <li key={v!.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v!.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                <div>
                  <p className="text-sm font-medium">{v!.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{v!.category.replace('_', ' ')}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No favourites yet.</p>
        )}
      </Section>

      <Section title="Looking for">
        <p className="text-sm">{INTENTION_LABEL[me.preferences.intention]}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ages {me.preferences.minAge}–{me.preferences.maxAge} · within {me.preferences.maxDistanceKm} km
        </p>
      </Section>

      <div className="flex flex-col gap-2">
        <Button asChild size="block">
          <Link href="/app/profile/edit">
            <Pencil className="h-4 w-4" /> Edit profile
          </Link>
        </Button>
        <Button asChild variant="secondary" size="block">
          <Link href="/app/settings">Settings</Link>
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
