import 'server-only';
import { serverEnv } from '@/lib/env';
import type { AiProfile, CompatibilityExplanation, CompatibilityResult, User } from '@/lib/types';
import { explainDeterministic, generateProfileDeterministic } from './deterministic';

/**
 * AI provider abstraction (server-only). Deterministic generation is always the base;
 * when OpenAI credentials exist the model refines the natural-language prose ONLY, from
 * permitted structured fields. Numeric traits/scores are never model-generated.
 */

async function openaiJson(system: string, user: string): Promise<Record<string, unknown> | null> {
  if (!serverEnv.hasOpenAI) return null;
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: serverEnv.openaiApiKey });
    const resp = await client.chat.completions.create({
      model: serverEnv.openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.6,
    });
    const text = resp.choices[0]?.message?.content ?? '';
    return JSON.parse(text);
  } catch (err) {
    console.warn('[ai] OpenAI call failed, using deterministic fallback:', err);
    return null;
  }
}

export async function generateAiProfile(user: User): Promise<AiProfile> {
  const base = generateProfileDeterministic(user);
  const data = await openaiJson(
    'You write warm, concise dating-compatibility profile summaries. Never use clinical, ' +
      'psychometric or diagnostic language. Return JSON with keys: summary (<=120 words), ' +
      'preferredPartnerDynamics (<=25 words), frictionAreas (<=25 words). Base it ONLY on the ' +
      'provided fields.',
    JSON.stringify({
      name: user.displayName,
      topValues: base.topValues,
      communicationStyle: base.communicationStyle,
      relationshipIntention: base.relationshipIntention,
      lifestylePattern: base.lifestylePattern,
      conflictApproach: base.conflictApproach,
      traits: base.traits,
    }),
  );
  if (!data) return base;
  return {
    ...base,
    summary: typeof data.summary === 'string' ? data.summary : base.summary,
    preferredPartnerDynamics:
      typeof data.preferredPartnerDynamics === 'string'
        ? data.preferredPartnerDynamics
        : base.preferredPartnerDynamics,
    frictionAreas: typeof data.frictionAreas === 'string' ? data.frictionAreas : base.frictionAreas,
    source: 'openai',
  };
}

export async function explainCompatibility(
  me: User,
  them: User,
  compat: CompatibilityResult,
): Promise<CompatibilityExplanation> {
  const base = explainDeterministic(me, them, compat);
  const data = await openaiJson(
    'You explain why two people may be compatible for a first date, warmly and without ' +
      'revealing private questionnaire answers. Return JSON with keys: alignmentPoints (array of ' +
      'exactly 3 short strings), potentialDifference (1 string), conversationTopic (1 string).',
    JSON.stringify({
      categoryScores: compat.categories,
      total: compat.total,
      myValues: me.aiProfile?.topValues ?? [],
      theirValues: them.aiProfile?.topValues ?? [],
      sharedInterests: me.interests.filter((i) =>
        them.interests.map((t) => t.toLowerCase()).includes(i.toLowerCase()),
      ),
    }),
  );
  if (!data || !Array.isArray(data.alignmentPoints) || data.alignmentPoints.length < 3) return base;
  const pts = (data.alignmentPoints as unknown[]).map(String);
  return {
    alignmentPoints: [pts[0]!, pts[1]!, pts[2]!],
    potentialDifference:
      typeof data.potentialDifference === 'string' ? data.potentialDifference : base.potentialDifference,
    conversationTopic:
      typeof data.conversationTopic === 'string' ? data.conversationTopic : base.conversationTopic,
    source: 'openai',
  };
}

export { generateProfileDeterministic, explainDeterministic };
