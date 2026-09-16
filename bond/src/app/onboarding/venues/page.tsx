'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { DEMO_VENUES } from '@/data/venues';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const CATEGORY_LABEL: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  wine_bar: 'Wine bar',
};

export default function VenuesStep() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const updateMe = useDemoStore((s) => s.updateMe);
  const finishOnboarding = useDemoStore((s) => s.finishOnboarding);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(me?.favouriteVenueIds ?? []);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_VENUES;
    return DEMO_VENUES.filter(
      (v) => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q),
    );
  }, [query]);

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 5 ? [...cur, id] : cur,
    );
  }

  function finish() {
    setSaving(true);
    updateMe({ favouriteVenueIds: selected });
    finishOnboarding();
    router.push('/app/proposals');
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Your favourite places</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick up to 5 restaurants, cafés or bars you love. BOND uses them to suggest great date
        venues. {selected.length}/5 selected.
      </p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          className="pl-10"
          placeholder="Search venues…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search venues"
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {filtered.map((v) => {
          const isSelected = selected.includes(v.id);
          const disabled = !isSelected && selected.length >= 5;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => toggle(v.id)}
                disabled={disabled}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-40',
                  isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-elevated',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.image} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{v.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {CATEGORY_LABEL[v.category]} · {v.address}
                  </p>
                </div>
                {isSelected ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Button className="mt-6" size="block" loading={saving} disabled={selected.length === 0} onClick={finish}>
        <Sparkles className="h-4 w-4" /> Generate my AI profile
      </Button>
    </div>
  );
}
