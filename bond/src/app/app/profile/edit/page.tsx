'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field, Input, RangeSlider, Textarea } from '@/components/ui/field';
import { RELATIONSHIP_INTENTIONS } from '@/lib/types';
import { useDemoStore } from '@/store/demo-store';

const INTENTION_LABELS: Record<string, string> = {
  long_term: 'Long-term',
  long_term_open_to_short: 'Long-term, open',
  short_term_open_to_long: 'Short-term, open',
  friends_first: 'Friends first',
  still_figuring_out: 'Figuring it out',
};

export default function EditProfilePage() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const updateMe = useDemoStore((s) => s.updateMe);
  const updatePreferences = useDemoStore((s) => s.updatePreferences);

  const [displayName, setName] = useState(me?.displayName ?? '');
  const [profession, setProfession] = useState(me?.profession ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [intro, setIntro] = useState(me?.intro ?? '');
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [newInterest, setNewInterest] = useState('');
  const [maxDistanceKm, setMaxDistance] = useState(me?.preferences.maxDistanceKm ?? 30);
  const [intention, setIntention] = useState(me?.preferences.intention ?? 'long_term');

  if (!me) return null;

  function addInterest() {
    const v = newInterest.trim();
    if (v && !interests.includes(v)) setInterests([...interests, v]);
    setNewInterest('');
  }

  function save() {
    updateMe({ displayName, profession, city, intro, interests });
    updatePreferences({ maxDistanceKm, intention });
    router.push('/app/profile');
  }

  return (
    <div className="animate-fade-in space-y-5">
      <button
        onClick={() => router.push('/app/profile')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </button>
      <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>

      <Field label="Display name" htmlFor="name">
        <Input id="name" value={displayName} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Profession" htmlFor="prof">
        <Input id="prof" value={profession} onChange={(e) => setProfession(e.target.value)} />
      </Field>
      <Field label="City" htmlFor="city">
        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      <Field label="Introduction" htmlFor="intro">
        <Textarea id="intro" rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} />
      </Field>

      <Field label="Interests & hobbies">
        <div className="mb-2 flex flex-wrap gap-2">
          {interests.map((i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-elevated px-3 py-1 text-xs">
              {i}
              <button aria-label={`Remove ${i}`} onClick={() => setInterests(interests.filter((x) => x !== i))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInterest();
              }
            }}
            placeholder="Add an interest"
          />
          <Button type="button" variant="secondary" onClick={addInterest} aria-label="Add interest">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Field>

      <Field label="Maximum distance" htmlFor="dist">
        <RangeSlider id="dist" min={1} max={200} value={maxDistanceKm} onChange={setMaxDistance} format={(v) => `${v} km`} />
      </Field>

      <Field label="Relationship intention">
        <ChipGroup
          options={RELATIONSHIP_INTENTIONS.map((v) => ({ value: v, label: INTENTION_LABELS[v]! }))}
          value={intention}
          onChange={(v) => setIntention(v as typeof intention)}
        />
      </Field>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => router.push('/app/profile')}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
