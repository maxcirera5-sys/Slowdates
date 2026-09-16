import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '@/data/questions';
import { evaluateCompatibility, intentionsCompatible, scoreTraits } from './engine';
import { DIMENSION_WEIGHTS, type Answer, type Preferences, type User } from '@/lib/types';

const basePrefs: Preferences = {
  genders: ['woman', 'man', 'nonbinary'],
  minAge: 18,
  maxAge: 99,
  maxDistanceKm: 100,
  intention: 'long_term',
  smoking: 'no_preference',
  drinking: 'no_preference',
  children: 'no_preference',
  languages: ['English'],
  firstRecipientRule: 'either',
  eitherCanInitiate: true,
};

function dobForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function makeUser(over: Partial<User> = {}): User {
  return {
    id: over.id ?? 'u',
    displayName: 'Test',
    dob: dobForAge(30),
    city: 'Barcelona',
    lat: 41.3874,
    lng: 2.1686,
    profession: 'Designer',
    languages: ['English'],
    intro: 'Hello there, nice to meet you.',
    gender: 'woman',
    interests: [],
    photos: [],
    preferences: { ...basePrefs },
    answers: [],
    favouriteVenueIds: [],
    aiProfile: null,
    onboardingComplete: true,
    discoveryPaused: false,
    ...over,
  };
}

/** Answer every scale question with `val`, and single/scenario/ranked deterministically. */
function answersAll(val: string): Answer[] {
  return QUESTIONS.map((q) => {
    if (q.type === 'scale') return { questionId: q.id, value: val };
    if (q.type === 'ranked') return { questionId: q.id, value: (q.options ?? []).map((o) => o.value).join(',') };
    return { questionId: q.id, value: q.options?.[0]?.value ?? '' };
  });
}

describe('eligibility filters', () => {
  it('passes for two compatible adults nearby', () => {
    const a = makeUser({ id: 'a', gender: 'woman', preferences: { ...basePrefs, genders: ['man'] } });
    const b = makeUser({ id: 'b', gender: 'man', preferences: { ...basePrefs, genders: ['woman'] } });
    expect(evaluateCompatibility(a, b).eligible).toBe(true);
  });

  it('rejects when under 18', () => {
    const a = makeUser({ id: 'a', dob: dobForAge(17) });
    const b = makeUser({ id: 'b' });
    const r = evaluateCompatibility(a, b);
    expect(r.eligible).toBe(false);
    expect(r.ineligibleReasons.join(' ')).toMatch(/18/);
  });

  it('rejects on non-mutual gender preference', () => {
    const a = makeUser({ id: 'a', gender: 'woman', preferences: { ...basePrefs, genders: ['woman'] } });
    const b = makeUser({ id: 'b', gender: 'man', preferences: { ...basePrefs, genders: ['woman'] } });
    // a wants women, b is a man -> a not satisfied
    expect(evaluateCompatibility(a, b).eligible).toBe(false);
  });

  it('rejects outside age preference', () => {
    const a = makeUser({ id: 'a', preferences: { ...basePrefs, minAge: 40, maxAge: 50 } });
    const b = makeUser({ id: 'b', dob: dobForAge(30) });
    expect(evaluateCompatibility(a, b).eligible).toBe(false);
  });

  it('rejects outside distance limits', () => {
    const a = makeUser({ id: 'a', lat: 41.4, lng: 2.17, preferences: { ...basePrefs, maxDistanceKm: 5 } });
    const b = makeUser({ id: 'b', lat: 40.4, lng: -3.7 }); // Madrid
    expect(evaluateCompatibility(a, b).eligible).toBe(false);
  });

  it('rejects when blocked or already passed', () => {
    const a = makeUser({ id: 'a' });
    const b = makeUser({ id: 'b' });
    expect(evaluateCompatibility(a, b, { blockedEitherWay: true }).eligible).toBe(false);
    expect(evaluateCompatibility(a, b, { alreadyPassed: true }).eligible).toBe(false);
  });

  it('applies the intention compatibility rule', () => {
    expect(intentionsCompatible('long_term', 'long_term_open_to_short')).toBe(true);
    expect(intentionsCompatible('long_term', 'friends_first')).toBe(false);
  });
});

describe('score calculation', () => {
  it('gives 100 for identical answers and is symmetric', () => {
    const a = makeUser({ id: 'a', answers: answersAll('5') });
    const b = makeUser({ id: 'b', answers: answersAll('5') });
    const r1 = evaluateCompatibility(a, b);
    const r2 = evaluateCompatibility(b, a);
    expect(r1.total).toBe(100);
    expect(r1.total).toBe(r2.total);
    for (const dim of Object.keys(DIMENSION_WEIGHTS) as (keyof typeof DIMENSION_WEIGHTS)[]) {
      expect(r1.categories[dim]).toBe(100);
    }
  });

  it('is deterministic across repeated calls', () => {
    const a = makeUser({ id: 'a', answers: answersAll('4') });
    const b = makeUser({ id: 'b', answers: answersAll('2') });
    const runs = Array.from({ length: 5 }, () => evaluateCompatibility(a, b).total);
    expect(new Set(runs).size).toBe(1);
  });

  it('respects the documented dimension weights', () => {
    const a = makeUser({ id: 'a', answers: answersAll('5') });
    const b = makeUser({ id: 'b', answers: answersAll('5') });
    const r = evaluateCompatibility(a, b);
    const recomputed = Math.round(
      (Object.keys(DIMENSION_WEIGHTS) as (keyof typeof DIMENSION_WEIGHTS)[]).reduce(
        (s, dim) => s + r.categories[dim] * DIMENSION_WEIGHTS[dim],
        0,
      ),
    );
    expect(recomputed).toBe(r.total);
    expect(DIMENSION_WEIGHTS.personality).toBe(0.3);
  });

  it('keeps scores within 0..100 for opposite answers', () => {
    const a = makeUser({ id: 'a', answers: answersAll('5') });
    const b = makeUser({ id: 'b', answers: answersAll('1') });
    const r = evaluateCompatibility(a, b);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('defaults dimensions to neutral 50 when there are no shared answers', () => {
    const a = makeUser({ id: 'a', answers: [] });
    const b = makeUser({ id: 'b', answers: [] });
    const r = evaluateCompatibility(a, b);
    expect(r.total).toBe(50);
    expect(r.categories.personality).toBe(50);
  });

  it('ignores questions only one side answered (missing optional values)', () => {
    const a = makeUser({ id: 'a', answers: [{ questionId: 'p1', value: '5' }] });
    const b = makeUser({ id: 'b', answers: [] });
    const r = evaluateCompatibility(a, b);
    expect(r.total).toBe(50); // nothing shared -> neutral
  });
});

describe('trait scoring', () => {
  it('produces five bounded trait scores', () => {
    const t = scoreTraits(answersAll('5'));
    for (const v of Object.values(t)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(Object.keys(t).sort()).toEqual(
      ['ambition', 'empathy', 'openness', 'planning', 'sociability'].sort(),
    );
  });
});
