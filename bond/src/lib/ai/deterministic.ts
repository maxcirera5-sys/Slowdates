import { QUESTIONS } from '@/data/questions';
import { scoreTraits } from '@/lib/compatibility/engine';
import type {
  AiProfile,
  Answer,
  CompatibilityExplanation,
  CompatibilityResult,
  User,
} from '@/lib/types';

/**
 * Deterministic, local AI-profile and explanation generation. Used when OpenAI
 * credentials are absent, and as the trustworthy fallback. No clinical language.
 */

function ans(answers: Answer[], id: string): string | undefined {
  return answers.find((a) => a.questionId === id)?.value;
}

function labelFor(questionId: string, value?: string): string | undefined {
  if (!value) return undefined;
  const q = QUESTIONS.find((x) => x.id === questionId);
  return q?.options?.find((o) => o.value === value)?.label;
}

function topValues(user: User): string[] {
  const ranked = (ans(user.answers, 'v1') ?? '').split(',').filter(Boolean);
  const labels = ranked
    .map((v) => labelFor('v1', v))
    .filter((x): x is string => Boolean(x))
    .slice(0, 3);
  const extra: string[] = [];
  if (Number(ans(user.answers, 'v3') ?? '0') >= 4) extra.push('Community');
  if (Number(ans(user.answers, 'a1') ?? '0') >= 4) extra.push('Ambition');
  if (Number(ans(user.answers, 'e1') ?? '0') >= 4) extra.push('Independence');
  return [...labels, ...extra].slice(0, 5);
}

const INTENTION_TEXT: Record<string, string> = {
  long_term: 'Looking for a committed, long-term relationship',
  long_term_open_to_short: 'Hoping for long-term, open to seeing where it goes',
  short_term_open_to_long: 'Open to something casual that could grow',
  friends_first: 'Wants to build a friendship first',
  still_figuring_out: 'Still figuring out what they want',
};

function communicationStyle(user: User): string {
  const direct = Number(ans(user.answers, 'c1') ?? '3');
  const needsSpace = Number(ans(user.answers, 'c3') ?? '3');
  if (direct >= 4 && needsSpace <= 2) return 'Direct and open — says what they feel in the moment';
  if (needsSpace >= 4) return 'Thoughtful — likes a little space to process before talking';
  return 'Balanced — open but considered';
}

function lifestylePattern(user: User): string {
  const early = Number(ans(user.answers, 'l1') ?? '3');
  const active = Number(ans(user.answers, 'l2') ?? '3');
  const pace = labelFor('l3', ans(user.answers, 'l3')) ?? 'a balanced pace';
  const parts = [early >= 4 ? 'early riser' : 'flexible mornings', active >= 4 ? 'active week' : 'relaxed routine'];
  return `${parts.join(', ')}; weekends at ${pace.toLowerCase()}`;
}

function conflictApproach(user: User): string {
  const scenario = labelFor('k1', ans(user.answers, 'k1'));
  const apologise = Number(ans(user.answers, 'k2') ?? '3');
  const base = scenario ? scenario.toLowerCase() : 'seeks a calm middle ground';
  return `Tends to ${base}${apologise >= 4 ? '; quick to make peace' : ''}`;
}

function frictionAreas(traits: ReturnType<typeof scoreTraits>): string {
  if (traits.planning >= 70 && traits.openness >= 70)
    return 'May juggle a love of plans with a pull toward spontaneity — worth naming early.';
  if (traits.ambition >= 75)
    return 'High drive can crowd out downtime; a partner who protects rest will help.';
  if (traits.sociability <= 35)
    return 'Values quiet time; a very high-energy social calendar could feel draining.';
  return 'Few obvious friction points — clear expectations will keep things smooth.';
}

export function generateProfileDeterministic(user: User): AiProfile {
  const traits = scoreTraits(user.answers);
  const values = topValues(user);
  const intention = INTENTION_TEXT[user.preferences.intention] ?? 'Open to connection';
  const comm = communicationStyle(user);
  const summary =
    `${user.displayName} comes across as ${describeTraits(traits)}. ` +
    `${intention.toLowerCase().startsWith('looking') ? 'They are' : 'They are'} ${intention.toLowerCase()}, ` +
    `and value ${values.slice(0, 3).join(', ').toLowerCase() || 'genuine connection'}. ` +
    `Communication style: ${comm.toLowerCase()}.`;

  return {
    summary: summary.slice(0, 600),
    topValues: values.length ? values : ['Honesty', 'Growth', 'Kindness'],
    communicationStyle: comm,
    relationshipIntention: intention,
    lifestylePattern: lifestylePattern(user),
    conflictApproach: conflictApproach(user),
    preferredPartnerDynamics:
      labelFor('e3', ans(user.answers, 'e3'))
        ? `Wants a ${labelFor('e3', ans(user.answers, 'e3'))!.toLowerCase()}`
        : 'Wants a supportive, growth-minded partner',
    frictionAreas: frictionAreas(traits),
    traits,
    source: 'deterministic',
    generatedAt: new Date().toISOString(),
  };
}

function describeTraits(t: ReturnType<typeof scoreTraits>): string {
  const adj: string[] = [];
  if (t.openness >= 60) adj.push('curious');
  if (t.empathy >= 60) adj.push('warm');
  if (t.planning >= 60) adj.push('organised');
  if (t.sociability >= 60) adj.push('outgoing');
  if (t.ambition >= 60) adj.push('driven');
  if (adj.length === 0) adj.push('grounded', 'easy-going');
  return adj.slice(0, 3).join(', ');
}

// --- Explanation ----------------------------------------------------------- //
export function explainDeterministic(
  me: User,
  them: User,
  compat: CompatibilityResult,
): CompatibilityExplanation {
  const sharedValues = intersect(topValues(me), topValues(them));
  const sharedInterests = intersect(me.interests, them.interests);
  const cats = compat.categories;

  const alignmentPoints: string[] = [];
  if (cats.values >= 65 || sharedValues.length)
    alignmentPoints.push(
      sharedValues.length
        ? `You share core values like ${sharedValues.slice(0, 2).join(' and ').toLowerCase()}.`
        : 'Your underlying values line up well.',
    );
  if (cats.lifeGoals >= 65)
    alignmentPoints.push('You picture the future in compatible ways, including commitment.');
  if (cats.communication >= 65)
    alignmentPoints.push('Your communication styles fit — a good sign for handling the hard talks.');
  if (cats.personality >= 65)
    alignmentPoints.push('Your temperaments complement each other day to day.');
  if (sharedInterests.length)
    alignmentPoints.push(`You both enjoy ${sharedInterests.slice(0, 2).join(' and ').toLowerCase()}.`);
  while (alignmentPoints.length < 3)
    alignmentPoints.push('There is a solid, balanced foundation to build on.');

  const weakest = (Object.keys(cats) as (keyof typeof cats)[]).reduce((lo, k) =>
    cats[k] < cats[lo] ? k : lo,
  );
  const diffMap: Record<string, string> = {
    personality: 'Your day-to-day energy levels differ a little — one of you may want more downtime.',
    values: 'A few priorities differ; talking them through early will pay off.',
    lifeGoals: 'Your longer-term plans are not identical — worth comparing timelines.',
    communication: 'You process things differently, so give each other room to be heard.',
    lifestyle: 'Your routines run at slightly different speeds.',
  };

  const topic =
    sharedInterests[0]
      ? `Swap a favourite memory involving ${sharedInterests[0].toLowerCase()}.`
      : sharedValues[0]
        ? `Talk about what ${sharedValues[0].toLowerCase()} looks like in everyday life.`
        : 'Ask each other what a perfect ordinary Sunday looks like.';

  return {
    alignmentPoints: [alignmentPoints[0]!, alignmentPoints[1]!, alignmentPoints[2]!],
    potentialDifference: diffMap[weakest] ?? diffMap.values!,
    conversationTopic: topic,
    source: 'deterministic',
  };
}

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase()));
}
