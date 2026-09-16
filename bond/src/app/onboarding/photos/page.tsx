'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

// DEMO photo bank (safe remote placeholders). In production these come from Storage uploads.
const DEMO_BANK = [
  'photo-1524504388940-b1c1722653e1',
  'photo-1517841905240-472988babdf9',
  'photo-1534528741775-53994a69daeb',
  'photo-1544005313-94ddf0286df2',
  'photo-1500648767791-00dcc994a43e',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1502823403499-6ccfcf4fb453',
  'photo-1508214751196-bcfd4ca60f91',
];
const url = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=60`;

export default function PhotosStep() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const updateMe = useDemoStore((s) => s.updateMe);
  const [photos, setPhotos] = useState<Photo[]>(me?.photos ?? []);

  const selectedIds = new Set(photos.map((p) => p.id));

  function toggle(id: string) {
    if (selectedIds.has(id)) {
      const next = photos.filter((p) => p.id !== id);
      if (next.length && !next.some((p) => p.isPrimary)) next[0]!.isPrimary = true;
      setPhotos(next);
    } else if (photos.length < 6) {
      setPhotos([...photos, { id, url: url(id), isPrimary: photos.length === 0, isDemo: true }]);
    }
  }

  function makePrimary(id: string) {
    setPhotos(photos.map((p) => ({ ...p, isPrimary: p.id === id })));
  }

  function next() {
    updateMe({ photos });
    router.push('/onboarding/preferences');
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Your photos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick up to 6. Tap a selected photo to make it your primary. Clear, recent photos of just
        you work best.
      </p>

      <p className="mt-4 text-xs font-medium text-primary-light">
        Demo mode — choose from sample photos. {photos.length}/6 selected.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {DEMO_BANK.map((id) => {
          const selected = selectedIds.has(id);
          const primary = photos.find((p) => p.id === id)?.isPrimary;
          return (
            <div key={id} className="relative">
              <button
                type="button"
                onClick={() => (selected ? makePrimary(id) : toggle(id))}
                aria-pressed={selected}
                aria-label={selected ? 'Make primary photo' : 'Select photo'}
                className={cn(
                  'relative block aspect-[3/4] w-full overflow-hidden rounded-lg border-2 transition-all',
                  selected ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url(id)} alt="" className="h-full w-full object-cover" />
                {primary ? (
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Star className="h-3 w-3" aria-hidden /> Primary
                  </span>
                ) : null}
                {selected && !primary ? (
                  <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                ) : null}
              </button>
              {selected ? (
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button className="mt-6" size="block" disabled={photos.length === 0} onClick={next}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
