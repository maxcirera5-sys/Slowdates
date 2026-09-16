import { QUESTIONS } from '@/data/questions';
import {
  COMPATIBILITY_DIMENSIONS,
  DIMENSION_WEIGHTS,
  type AiTraits,
  type Answer,
  type CategoryScores,
  type CompatibilityDimension,
  type CompatibilityResult,
  type Question,
  type RelationshipIntention,
  type User,
} from '@/lib/types';
import { ageFromDob, distanceKm } from '@/lib/utils';

const QUESTION_BY_ID = new Map<string, Question>(QUESTIONS.map((q) => [q.id, q]));

function answerMap(answers: Answer[]): Map<string, string> {
  return new Map(answers.map((a) => [a.questionId, a.value]));
}

/** Normalise a 1–5 agreement answer to 0..1, honouring the question polarity. */
function scaleValue(raw: string, polarity: 1 | -1 = 1): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  const x = (n - 1) / 4;
  return polarity === -1 ? 1 - x : x;
}

/** Similarity 0..1 between two users' answers to one question. Null if unanswerable. */
function questionSimilarity(q: Question, a?: string, b?: string): number | null {
  if (a == null || b == null) return null;
  if (q.type === 'scale') {
    const va = scaleValue(a, q.polarity ?? 1);
    const vb = scaleValue(b, q.polarity ?? 1);
    if (va == null || vb == null) return null;
    return 1 - Math.abs(va - vb);
  }
  if (q.type === 'single' || q.type === 'scenario') {
    return a === b ? 1 : 0;
  }
  if (q.type === 'ranked') {
    return rankedSimilarity(a, b);
  }
  return null;
}

/** Normalised rank agreement between two ordered csv answers. */
function rankedSimilarity(a: string, b: string): number | null {
  const ra = a.split(',').filter(Boolean);
  const rb = b.split(',').filter(Boolean);
  if (ra.length === 0 || rb.length === 0) return null;
  const posB = new Map(rb.map((v, i) => [v, i]));
  let dist = 0;
  let counted = 0;
  ra.forEach((v, i) => {
    const j = posB.get(v);
    if (j != null) {
      dist += Math.abs(i - j);
      counted += 1;
    }
  });
  if (counted === 0) return 0;
  const maxDist = Math.floor((counted * counted) / 2) || 1;
  return Math.max(0, 1 - dist / maxDist);
}

/** Per-dimension score 0..100. Dimensions with no shared answers default to neutral 50. */
function categoryScores(a: Answer[], b: Answer[]): CategoryScores {
  const ma = answerMap(a);
  const mb = answerMap(b);
  const acc: Record<CompatibilityDimension, { sum: number; n: number }> = {
    personality: { sum: 0, n: 0 },
    values: { sum: 0, n: 0 },
    lifeGoals: { sum: 0, n: 0 },
    communication: { sum: 0, n: 0 },
    lifestyle: { sum: 0, n: 0 },
  };
  for (const q of QUESTIONS) {
    const sim = questionSimilarity(q, ma.get(q.id), mb.get(q.id));
    if (sim == null) continue;
    acc[q.dimension].sum += sim;
    acc[q.dimension].n += 1;
  }
  const out = {} as CategoryScores;
  for (const dim of COMPATIBILITY_DIMENSIONS) {
    const { sum, n } = acc[dim];
    out[dim] = n === 0 ? 50 : Math.round((sum / n) * 100);
  }
  return out;
}

// --- Eligibility ----------------------------------------------------------- //
const INTENTION_LEVEL: Record<RelationshipIntention, number> = {
  long_term: 3,
  long_term_open_to_short: 2,
  short_term_open_to_long: 2,
  still_figuring_out: 2,
  friends_first: 1,
};

/** MVP rule: incompatible only when commitment expectations are far apart. */
export function intentionsCompatible(a: RelationshipIntention, b: RelationshipIntention): boolean {
  return Math.abs(INTENTION_LEVEL[a] - INTENTION_LEVEL[b]) <= 1;
}

export interface EligibilityContext {
  blockedEitherWay?: boolean;
  alreadyPassed?: boolean;
}

function eligibility(a: User, b: User, ctx: EligibilityContext = {}): string[] {
  const reasons: string[] = [];
  const ageA = ageFromDob(a.dob);
  const ageB = ageFromDob(b.dob);

  if (ageA < 18 || ageB < 18) reasons.push('Both users must be 18 or older.');
  if (!a.preferences.genders.includes(b.gender)) reasons.push('Gender preference not met.');
  if (!b.preferences.genders.includes(a.gender)) reasons.push('Gender preference not mutual.');
  if (ageB < a.preferences.minAge || ageB > a.preferences.maxAge)
    reasons.push('Age preference not met.');
  if (ageA < b.preferences.minAge || ageA > b.preferences.maxAge)
    reasons.push('Age preference not mutual.');

  const d = distanceKm(a, b);
  if (d > a.preferences.maxDistanceKm || d > b.preferences.maxDistanceKm)
    reasons.push('Outside distance limits.');

  if (!intentionsCompatible(a.preferences.intention, b.preferences.intention))
    reasons.push('Relationship intentions are incompatible.');

  if (ctx.blockedEitherWay) reasons.push('One user has blocked the other.');
  if (ctx.alreadyPassed) reasons.push('This proposal was already passed.');
  return reasons;
}

/** Declared-preference alignment (habits, languages, children, intention). Never photo-based. */
function preferenceAlignment(a: User, b: User): number {
  let score = 0;
  let max = 0;
  const habit = (x: string, y: string) => {
    max += 1;
    if (x === 'no_preference' || y === 'no_preference' || x === y) score += 1;
  };
  habit(a.preferences.smoking, b.preferences.smoking);
  habit(a.preferences.drinking, b.preferences.drinking);

  max += 1;
  if (
    a.preferences.children === 'no_preference' ||
    b.preferences.children === 'no_preference' ||
    a.preferences.children === b.preferences.children ||
    (a.preferences.children === 'open' && b.preferences.children !== 'dont_want') ||
    (b.preferences.children === 'open' && a.preferences.children !== 'dont_want')
  )
    score += 1;

  max += 1;
  if (intentionsCompatible(a.preferences.intention, b.preferences.intention)) score += 1;

  max += 1;
  const langA = new Set(a.languages.map((l) => l.toLowerCase()));
  if (b.languages.some((l) => langA.has(l.toLowerCase()))) score += 1;

  return Math.round((score / max) * 100);
}

/**
 * Deterministic compatibility. The numeric score never comes from a language model;
 * the LLM only writes the natural-language explanation from permitted fields.
 */
export function evaluateCompatibility(
  a: User,
  b: User,
  ctx: EligibilityContext = {},
): CompatibilityResult {
  const reasons = eligibility(a, b, ctx);
  const categories = categoryScores(a.answers, b.answers);
  const total = Math.round(
    COMPATIBILITY_DIMENSIONS.reduce((sum, dim) => sum + categories[dim] * DIMENSION_WEIGHTS[dim], 0),
  );
  return {
    eligible: reasons.length === 0,
    ineligibleReasons: reasons,
    total: clamp(total),
    categories,
    preferenceAlignment: preferenceAlignment(a, b),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// --- Trait scoring (self, for the AI profile) ------------------------------ //
function avgScale(m: Map<string, string>, ids: { id: string; polarity?: 1 | -1 }[]): number {
  const vals: number[] = [];
  for (const { id, polarity } of ids) {
    const raw = m.get(id);
    if (raw == null) continue;
    const v = scaleValue(raw, polarity ?? 1);
    if (v != null) vals.push(v);
  }
  if (vals.length === 0) return 0.5;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Deterministic 0–100 trait scores from a user's own answers. */
export function scoreTraits(answers: Answer[]): AiTraits {
  void QUESTION_BY_ID; // questions referenced by id below
  const m = answerMap(answers);
  const single = (id: string, values: string[]) => (values.includes(m.get(id) ?? '') ? 1 : 0);

  const openness =
    0.6 * avgScale(m, [{ id: 'p2' }, { id: 'p3', polarity: -1 }, { id: 'a5' }]) +
    0.4 * single('p4', ['adventure', 'social']);
  const sociability =
    0.7 * avgScale(m, [{ id: 'p1' }, { id: 'c5' }]) + 0.3 * single('p4', ['social']);
  const empathy = avgScale(m, [{ id: 'p5' }, { id: 'k2' }, { id: 'k4' }]);
  const planning =
    0.7 * avgScale(m, [{ id: 'p6' }, { id: 'a1' }, { id: 'p3' }]) + 0.3 * single('l3', ['packed']);
  const ambition =
    0.7 * avgScale(m, [{ id: 'a1' }, { id: 'a2' }, { id: 'a3', polarity: -1 }]) +
    0.3 * single('a4', ['impact', 'mastery', 'wealth']);

  const pct = (x: number) => Math.round(clamp(x * 100));
  return {
    openness: pct(openness),
    sociability: pct(sociability),
    empathy: pct(empathy),
    planning: pct(planning),
    ambition: pct(ambition),
  };
}
