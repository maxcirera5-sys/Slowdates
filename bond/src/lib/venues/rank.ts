import type { User, Venue } from '@/lib/types';
import { distanceKm } from '@/lib/utils';

/**
 * Deterministic venue ranking (client-safe, pure). Filters for first-date suitability,
 * then ranks by balanced travel, shared favourites, atmosphere and time-of-day fit.
 * Any natural-language "why" is built from these structured factors.
 */

const FIRST_DATE_ATMOSPHERE = ['intimate', 'cosy', 'quiet', 'relaxed', 'refined'];

export interface RankedVenue {
  venue: Venue;
  score: number;
  reasons: string[];
}

function timeOfDay(iso?: string): 'day' | 'evening' {
  if (!iso) return 'evening';
  const h = new Date(iso).getHours();
  return h < 17 ? 'day' : 'evening';
}

export function rankVenues(
  me: User,
  them: User,
  venues: Venue[],
  selectedTimeIso?: string,
): RankedVenue[] {
  const mid = { lat: (me.lat + them.lat) / 2, lng: (me.lng + them.lng) / 2 };
  const favourites = new Set([...me.favouriteVenueIds, ...them.favouriteVenueIds]);
  const tod = timeOfDay(selectedTimeIso);

  const ranked = venues
    .map((venue) => {
      const reasons: string[] = [];
      let score = 50;

      // Balanced, short travel from the midpoint.
      const d = distanceKm(mid, venue);
      const travel = Math.max(0, 20 - d * 4);
      score += travel;
      if (d < 2.5) reasons.push('roughly equal travel for you both');

      // Shared favourite is a strong signal.
      if (favourites.has(venue.id)) {
        score += 25;
        reasons.push('one of your favourite spots');
      }

      // First-date atmosphere.
      if (venue.atmosphereTags.some((t) => FIRST_DATE_ATMOSPHERE.includes(t))) {
        score += 12;
        reasons.push('calm, first-date-friendly atmosphere');
      }

      // Time-of-day fit.
      const isDayVenue = venue.category === 'cafe';
      if ((tod === 'day' && isDayVenue) || (tod === 'evening' && !isDayVenue)) {
        score += 8;
        reasons.push(tod === 'day' ? 'great for daytime' : 'right vibe for the evening');
      }

      return { venue, score: Math.round(score), reasons };
    })
    .sort((a, b) => b.score - a.score);

  return ranked;
}

export function venueReason(ranked: RankedVenue): string {
  const rs = ranked.reasons.length ? ranked.reasons : ['central and well suited to a first date'];
  const list = rs.slice(0, 3).join(', ');
  return `BOND picked ${ranked.venue.name} because it's ${list}.`;
}

export function meetingPointFor(venue: Venue): string {
  return `At the entrance of ${venue.name} — ${venue.address}`;
}
