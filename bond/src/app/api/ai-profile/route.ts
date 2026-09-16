import { NextResponse } from 'next/server';
import { generateAiProfile } from '@/lib/ai';
import type { User } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/ai-profile — generate an AI compatibility profile from a user.
 * Uses OpenAI when configured; deterministic generation otherwise. Server-only.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { user?: User };
    if (!body.user || !Array.isArray(body.user.answers)) {
      return NextResponse.json({ error: 'A user with answers is required.' }, { status: 400 });
    }
    const profile = await generateAiProfile(body.user);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Could not generate profile.' }, { status: 500 });
  }
}
