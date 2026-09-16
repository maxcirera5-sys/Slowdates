'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field, RangeSlider } from '@/components/ui/field';
import {
  CHILDREN,
  FIRST_RECIPIENT_RULE,
  GENDERS,
  HABIT,
  RELATIONSHIP_INTENTIONS,
  preferencesSchema,
  type Gender,
  type Preferences,
} from '@/lib/types';
import { useDemoStore } from '@/store/demo-store';

const GENDER_LABELS: Record<Gender, string> = { woman: 'Women', man: 'Men', nonbinary: 'Non-binary' };
const INTENTION_LABELS: Record<string, string> = {
  long_term: 'Long-term',
  long_term_open_to_short: 'Long-term, open',
  short_term_open_to_long: 'Short-term, open',
  friends_first: 'Friends first',
  still_figuring_out: 'Figuring it out',
};
const HABIT_LABELS: Record<string, string> = {
  never: 'Never',
  sometimes: 'Sometimes',
  often: 'Often',
  no_preference: 'No preference',
};
const CHILDREN_LABELS: Record<string, string> = {
  have: 'Have kids',
  want: 'Want kids',
  dont_want: "Don't want",
  open: 'Open',
  no_preference: 'No preference',
};
const RULE_LABELS: Record<string, string> = {
  either: 'Either of us',
  me_first: 'I go first',
  them_first: 'They go first',
  auto: 'Let BOND decide',
};

export default function PreferencesStep() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const updatePreferences = useDemoStore((s) => s.updatePreferences);
  const base = me?.preferences;

  const [genders, setGenders] = useState<Gender[]>(base?.genders ?? []);
  const [minAge, setMinAge] = useState(base?.minAge ?? 27);
  const [maxAge, setMaxAge] = useState(base?.maxAge ?? 40);
  const [maxDistanceKm, setMaxDistance] = useState(base?.maxDistanceKm ?? 30);
  const [intention, setIntention] = useState(base?.intention ?? 'long_term');
  const [smoking, setSmoking] = useState(base?.smoking ?? 'no_preference');
  const [drinking, setDrinking] = useState(base?.drinking ?? 'sometimes');
  const [children, setChildren] = useState(base?.children ?? 'no_preference');
  const [firstRecipientRule, setRule] = useState(base?.firstRecipientRule ?? 'either');
  const [eitherCanInitiate, setEither] = useState(base?.eitherCanInitiate ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const candidate: Preferences = {
      genders,
      minAge,
      maxAge,
      maxDistanceKm,
      intention,
      smoking,
      drinking,
      children,
      languages: me?.languages ?? [],
      firstRecipientRule,
      eitherCanInitiate,
    };
    const parsed = preferencesSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please review your preferences.');
      return;
    }
    updatePreferences(candidate);
    router.push('/onboarding/questions');
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Who you’d like to meet</h1>
        <p className="mt-1 text-sm text-muted-foreground">You can change any of this later.</p>
      </div>

      <Field label="I’m interested in">
        <ChipGroup
          multiple
          options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
          value={genders}
          onChange={(v) => setGenders(v as Gender[])}
        />
      </Field>

      <Field label="Age range" htmlFor="minAge">
        <div className="space-y-2">
          <RangeSlider id="minAge" min={18} max={99} value={minAge} onChange={setMinAge} format={(v) => `min ${v}`} />
          <RangeSlider min={18} max={99} value={maxAge} onChange={setMaxAge} format={(v) => `max ${v}`} />
        </div>
      </Field>

      <Field label="Maximum distance" htmlFor="dist">
        <RangeSlider id="dist" min={1} max={200} value={maxDistanceKm} onChange={setMaxDistance} format={(v) => `${v} km`} />
      </Field>

      <Field label="Looking for">
        <ChipGroup
          options={RELATIONSHIP_INTENTIONS.map((v) => ({ value: v, label: INTENTION_LABELS[v]! }))}
          value={intention}
          onChange={(v) => setIntention(v as typeof intention)}
        />
      </Field>

      <Field label="Smoking">
        <ChipGroup options={HABIT.map((v) => ({ value: v, label: HABIT_LABELS[v]! }))} value={smoking} onChange={(v) => setSmoking(v as typeof smoking)} />
      </Field>

      <Field label="Drinking">
        <ChipGroup options={HABIT.map((v) => ({ value: v, label: HABIT_LABELS[v]! }))} value={drinking} onChange={(v) => setDrinking(v as typeof drinking)} />
      </Field>

      <Field label="Children">
        <ChipGroup options={CHILDREN.map((v) => ({ value: v, label: CHILDREN_LABELS[v]! }))} value={children} onChange={(v) => setChildren(v as typeof children)} />
      </Field>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">How scheduling works</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          BOND is inclusive by design — you choose the workflow, it’s never based on gender.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="When there’s mutual interest, who proposes times first?">
            <ChipGroup
              options={FIRST_RECIPIENT_RULE.map((v) => ({ value: v, label: RULE_LABELS[v]! }))}
              value={firstRecipientRule}
              onChange={(v) => setRule(v as typeof firstRecipientRule)}
            />
          </Field>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Either person can start scheduling</span>
            <input
              type="checkbox"
              checked={eitherCanInitiate}
              onChange={(e) => setEither(e.target.checked)}
              className="h-6 w-6 accent-primary"
            />
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button size="block" disabled={genders.length === 0} onClick={submit}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
