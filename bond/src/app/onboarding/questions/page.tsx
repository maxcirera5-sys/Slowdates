'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { QUESTIONS } from '@/data/questions';
import type { Answer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const SCALE = [
  { v: '1', label: 'Strongly disagree' },
  { v: '2', label: 'Disagree' },
  { v: '3', label: 'Neutral' },
  { v: '4', label: 'Agree' },
  { v: '5', label: 'Strongly agree' },
];

const CATEGORY_LABEL: Record<string, string> = {
  personality: 'Personality',
  values: 'Values',
  ambition: 'Ambition',
  communication: 'Communication',
  conflict: 'Conflict style',
  lifestyle: 'Lifestyle',
  expectations: 'Expectations',
  future: 'Future goals',
};

export default function QuestionsStep() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const setAnswers = useDemoStore((s) => s.setAnswers);

  const [answers, setLocal] = useState<Record<string, string>>(() =>
    Object.fromEntries((me?.answers ?? []).map((a) => [a.questionId, a.value])),
  );
  const [i, setI] = useState(0);

  const q = QUESTIONS[i]!;
  const total = QUESTIONS.length;
  const progress = ((i + 1) / total) * 100;
  const current = answers[q.id] ?? '';

  const rankedOrder = useMemo(
    () => (q.type === 'ranked' && current ? current.split(',').filter(Boolean) : []),
    [q.type, current],
  );

  function set(value: string) {
    setLocal((a) => ({ ...a, [q.id]: value }));
  }

  function toggleRank(value: string) {
    const order = current ? current.split(',').filter(Boolean) : [];
    const next = order.includes(value) ? order.filter((v) => v !== value) : [...order, value];
    set(next.join(','));
  }

  const rankedComplete = q.type !== 'ranked' || rankedOrder.length === (q.options?.length ?? 0);
  const answered = Boolean(current) && rankedComplete;

  function next() {
    if (i < total - 1) {
      setI(i + 1);
    } else {
      const list: Answer[] = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      setAnswers(list);
      router.push('/onboarding/venues');
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-widest text-primary-light">
          {CATEGORY_LABEL[q.category]}
        </span>
        <span>
          {i + 1} / {total}
        </span>
      </div>
      <ProgressBar value={progress} label="Questionnaire progress" />

      <h1 className="mt-6 text-balance text-xl font-semibold leading-snug">{q.prompt}</h1>

      <div className="mt-6 space-y-2.5">
        {q.type === 'scale'
          ? SCALE.map((opt) => (
              <OptionButton key={opt.v} selected={current === opt.v} onClick={() => set(opt.v)}>
                {opt.label}
              </OptionButton>
            ))
          : null}

        {q.type === 'single' || q.type === 'scenario'
          ? q.options?.map((opt) => (
              <OptionButton key={opt.value} selected={current === opt.value} onClick={() => set(opt.value)}>
                {opt.label}
              </OptionButton>
            ))
          : null}

        {q.type === 'ranked' ? (
          <>
            <p className="mb-1 text-sm text-muted-foreground">
              Tap in order, most important first.
            </p>
            {q.options?.map((opt) => {
              const rank = rankedOrder.indexOf(opt.value);
              const selected = rank >= 0;
              return (
                <OptionButton key={opt.value} selected={selected} onClick={() => toggleRank(opt.value)}>
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold',
                        selected ? 'border-primary bg-primary/20 text-primary-light' : 'border-border text-muted-foreground',
                      )}
                    >
                      {selected ? rank + 1 : ''}
                    </span>
                    {opt.label}
                  </span>
                </OptionButton>
              );
            })}
            {rankedOrder.length ? (
              <button
                type="button"
                onClick={() => set('')}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Reset order
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-8 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button type="button" onClick={next} disabled={!answered} className="flex-1">
          {i === total - 1 ? 'Finish' : 'Next'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-lg border p-4 text-left text-sm font-medium transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-surface text-muted-foreground hover:bg-elevated hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
