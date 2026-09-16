import { QUESTIONS } from '@/data/questions';
import type { Answer, Photo, Preferences, User } from '@/lib/types';

/**
 * DEMO DATA — the seeded demo profile the visitor enters as ("me") plus a handful of
 * curated candidates. Questionnaire answers are generated deterministically from a
 * per-user seed, with a few signature answers curated so the top match reads convincingly.
 */

function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildAnswers(seed: string, overrides: Record<string, string> = {}): Answer[] {
  const rnd = mulberry32(hash(seed));
  return QUESTIONS.map((q) => {
    if (overrides[q.id] != null) return { questionId: q.id, value: overrides[q.id]! };
    if (q.type === 'scale') return { questionId: q.id, value: String(1 + Math.floor(rnd() * 5)) };
    if (q.type === 'ranked') {
      const vals = (q.options ?? []).map((o) => o.value);
      for (let i = vals.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [vals[i], vals[j]] = [vals[j]!, vals[i]!];
      }
      return { questionId: q.id, value: vals.join(',') };
    }
    const opts = q.options ?? [];
    return { questionId: q.id, value: opts[Math.floor(rnd() * opts.length)]?.value ?? '' };
  });
}

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=60`;

function photos(ids: string[]): Photo[] {
  return ids.map((raw, i) => ({
    id: `ph_${i}`,
    url: UNSPLASH(raw),
    isPrimary: i === 0,
    isDemo: true,
  }));
}

const basePrefs: Preferences = {
  genders: ['man', 'woman', 'nonbinary'],
  minAge: 27,
  maxAge: 40,
  maxDistanceKm: 30,
  intention: 'long_term',
  smoking: 'never',
  drinking: 'sometimes',
  children: 'open',
  languages: ['English', 'Spanish'],
  firstRecipientRule: 'either',
  eitherCanInitiate: true,
};

// Signature answers that make Elena the strongest match for the demo user.
const HARMONY: Record<string, string> = {
  p2: '5', p3: '2', v2: '5', v3: '4', a1: '5', a2: '4', c1: '4', c2: '4',
  k2: '4', k4: '5', l2: '4', f3: '5', v1: 'growth,honesty,kindness,freedom,family',
  p4: 'adventure', a4: 'impact', c4: 'address', l3: 'mixed', f1: 'open',
};

export const DEMO_ME: User = {
  id: 'me',
  displayName: 'Alex',
  dob: '1993-05-14',
  city: 'Barcelona',
  lat: 41.3874,
  lng: 2.1686,
  profession: 'Product Designer',
  languages: ['English', 'Spanish'],
  intro:
    'Designer who reads too much, runs by the beach at dawn, and believes the best conversations happen over a slow dinner.',
  gender: 'woman',
  interests: ['Design', 'Running', 'Natural wine', 'Ceramics', 'Travel'],
  photos: photos(['photo-1524504388940-b1c1722653e1', 'photo-1517841905240-472988babdf9']),
  preferences: { ...basePrefs, genders: ['man', 'woman', 'nonbinary'] },
  answers: buildAnswers('me', HARMONY),
  favouriteVenueIds: ['v_monocrom', 'v_nomad', 'v_barbrutal', 'v_gresca', 'v_satan'],
  aiProfile: null,
  onboardingComplete: true,
  discoveryPaused: false,
  isDemo: true,
};

export const DEMO_CANDIDATES: User[] = [
  {
    id: 'elena',
    displayName: 'Elena',
    dob: '1993-02-09',
    city: 'Barcelona',
    lat: 41.3954,
    lng: 2.1621,
    profession: 'Architect',
    languages: ['English', 'Spanish', 'Italian'],
    intro:
      'Ambitious but grounded. I love deep conversations, quiet plans and long dinners. Looking to build something real.',
    gender: 'woman',
    interests: ['Travel', 'Natural wine', 'Running', 'Art', 'Photography'],
    photos: photos([
      'photo-1534528741775-53994a69daeb',
      'photo-1544005313-94ddf0286df2',
      'photo-1531123897727-8f129e1688ce',
    ]),
    preferences: { ...basePrefs, genders: ['woman', 'man'] },
    answers: buildAnswers('elena', HARMONY),
    favouriteVenueIds: ['v_monocrom', 'v_disfrutar', 'v_barbrutal', 'v_nomad', 'v_paradiso'],
    aiProfile: null,
    onboardingComplete: true,
    discoveryPaused: false,
    isDemo: true,
  },
  {
    id: 'marc',
    displayName: 'Marc',
    dob: '1990-11-02',
    city: 'Barcelona',
    lat: 41.3809,
    lng: 2.1735,
    profession: 'Software Engineer',
    languages: ['English', 'Catalan', 'Spanish'],
    intro:
      'Engineer who cooks on weekends and hikes when the city gets loud. Curious, calm, and a bit competitive at board games.',
    gender: 'man',
    interests: ['Cooking', 'Hiking', 'Coffee', 'Board games', 'Cycling'],
    photos: photos([
      'photo-1500648767791-00dcc994a43e',
      'photo-1506794778202-cad84cf45f1d',
      'photo-1519085360753-af0119f7cbe7',
    ]),
    preferences: { ...basePrefs, genders: ['woman'] },
    answers: buildAnswers('marc', {
      p2: '4', v2: '4', a1: '4', c1: '3', k4: '4', l2: '5', f3: '4', p4: 'quiet', a4: 'balance',
    }),
    favouriteVenueIds: ['v_gresca', 'v_nomad', 'v_satan', 'v_vinitus'],
    aiProfile: null,
    onboardingComplete: true,
    discoveryPaused: false,
    isDemo: true,
  },
  {
    id: 'noa',
    displayName: 'Noa',
    dob: '1995-07-21',
    city: 'Barcelona',
    lat: 41.4012,
    lng: 2.1902,
    profession: 'Documentary Filmmaker',
    languages: ['English', 'Hebrew', 'Spanish'],
    intro:
      'Storyteller, night owl, and firm believer in spontaneous road trips. I care about honesty and making things that matter.',
    gender: 'nonbinary',
    interests: ['Film', 'Music', 'Politics', 'Travel', 'Vintage markets'],
    photos: photos(['photo-1502823403499-6ccfcf4fb453', 'photo-1508214751196-bcfd4ca60f91']),
    preferences: { ...basePrefs, genders: ['woman', 'nonbinary'], intention: 'long_term_open_to_short' },
    answers: buildAnswers('noa', { p1: '5', v2: '5', c1: '5', p4: 'social', a4: 'impact' }),
    favouriteVenueIds: ['v_paradiso', 'v_barbrutal', 'v_vinitus'],
    aiProfile: null,
    onboardingComplete: true,
    discoveryPaused: false,
    isDemo: true,
  },
  {
    id: 'diego',
    displayName: 'Diego',
    dob: '1988-03-30',
    city: "L'Hospitalet",
    lat: 41.3599,
    lng: 2.0999,
    profession: 'Chef',
    languages: ['Spanish', 'English'],
    intro:
      'Chef by trade, romantic by nature. Weekends are for markets, wine and long walks. I want a real partnership.',
    gender: 'man',
    interests: ['Food', 'Wine', 'Markets', 'Jazz', 'Travel'],
    photos: photos(['photo-1506794778202-cad84cf45f1d', 'photo-1500648767791-00dcc994a43e']),
    preferences: { ...basePrefs, genders: ['woman'], maxDistanceKm: 40 },
    answers: buildAnswers('diego', { v2: '5', a2: '5', f3: '5', l5: '5', a4: 'mastery' }),
    favouriteVenueIds: ['v_disfrutar', 'v_gresca', 'v_vinitus'],
    aiProfile: null,
    onboardingComplete: true,
    discoveryPaused: false,
    isDemo: true,
  },
];

export const ALL_DEMO_USERS: User[] = [DEMO_ME, ...DEMO_CANDIDATES];
export const demoUserById = (id: string) => ALL_DEMO_USERS.find((u) => u.id === id);
