import { NextResponse } from 'next/server';
import { explainCompatibility } from '@/lib/ai';
import { evaluateCompatibility } from '@/lib/compatibility/engine';
import type { User } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/compatibility/explain — deterministic score + natural-language explanation.
 * The numeric score is always computed server-side; the LLM only writes the prose.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { me?: User; them?: User };
    if (!body.me || !body.them) {
      return NextResponse.json({ error: 'Both users are required.' }, { status: 400 });
    }
    const compatibility = evaluateCompatibility(body.me, body.them);
    const explanation = await explainCompatibility(body.me, body.them, compatibility);
    return NextResponse.json({ compatibility, explanation });
  } catch {
    return NextResponse.json({ error: 'Could not evaluate compatibility.' }, { status: 500 });
  }
}
