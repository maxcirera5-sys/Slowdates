'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Photo } from '@/lib/types';

export function PhotoCarousel({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-brand-gradient text-2xl font-semibold text-primary-foreground">
        {name}
      </div>
    );
  }
  const active = photos[Math.min(index, photos.length - 1)]!;
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-elevated">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={active.url} alt={`${name} photo ${index + 1}`} className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 p-2">
        {photos.map((p, i) => (
          <span
            key={p.id}
            className={cn('h-1 flex-1 rounded-full', i === index ? 'bg-white' : 'bg-white/35')}
          />
        ))}
      </div>
      {photos.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-0 top-0 h-full w-1/3 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
          />
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-0 top-0 h-full w-1/3 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
          />
        </>
      ) : null}
    </div>
  );
}
