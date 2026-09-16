import 'server-only';
import { DEMO_VENUES } from '@/data/venues';
import { serverEnv } from '@/lib/env';
import type { Venue } from '@/lib/types';

/**
 * Places provider abstraction (server-only). Production adapter would query Google
 * Places; the mock adapter returns the local demo catalogue. Both satisfy the same
 * contract so the rest of the app never branches on the provider.
 */
export interface PlacesProvider {
  searchVenues(near: { lat: number; lng: number }): Promise<Venue[]>;
}

const mockProvider: PlacesProvider = {
  async searchVenues() {
    return DEMO_VENUES;
  },
};

const googleProvider: PlacesProvider = {
  async searchVenues(near) {
    // Production adapter. Requires GOOGLE_PLACES_API_KEY. Kept minimal for the MVP;
    // falls back to the demo catalogue if the request fails.
    try {
      const url = new URL('https://places.googleapis.com/v1/places:searchNearby');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': serverEnv.googlePlacesApiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.priceLevel,places.types',
        },
        body: JSON.stringify({
          includedTypes: ['restaurant', 'cafe', 'bar'],
          maxResultCount: 12,
          locationRestriction: {
            circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 4000 },
          },
        }),
      });
      if (!res.ok) throw new Error(`Places ${res.status}`);
      const json = (await res.json()) as { places?: GooglePlace[] };
      return (json.places ?? []).map(mapGooglePlace);
    } catch (err) {
      console.warn('[places] Google request failed, using demo catalogue:', err);
      return DEMO_VENUES;
    }
  },
};

export function getPlacesProvider(): PlacesProvider {
  return serverEnv.hasPlaces ? googleProvider : mockProvider;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  priceLevel?: string;
  types?: string[];
}

function mapGooglePlace(p: GooglePlace): Venue {
  const priceMap: Record<string, 1 | 2 | 3 | 4> = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  const category: Venue['category'] = p.types?.includes('cafe')
    ? 'cafe'
    : p.types?.includes('bar')
      ? 'bar'
      : 'restaurant';
  return {
    id: p.id,
    name: p.displayName?.text ?? 'Venue',
    category,
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    priceLevel: priceMap[p.priceLevel ?? ''] ?? 2,
    atmosphereTags: [],
    dietaryTags: [],
    image: '',
  };
}
