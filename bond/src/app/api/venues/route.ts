import { NextResponse } from 'next/server';
import { getPlacesProvider } from '@/lib/places';

export const runtime = 'nodejs';

/**
 * POST /api/venues — search venues near a point via the Places provider abstraction.
 * Google Places in production; the local demo catalogue otherwise.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lat?: number; lng?: number };
    const lat = typeof body.lat === 'number' ? body.lat : 41.3874;
    const lng = typeof body.lng === 'number' ? body.lng : 2.1686;
    const venues = await getPlacesProvider().searchVenues({ lat, lng });
    return NextResponse.json({ venues });
  } catch {
    return NextResponse.json({ error: 'Could not load venues.' }, { status: 500 });
  }
}
