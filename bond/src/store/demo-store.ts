'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ALL_DEMO_USERS, DEMO_CANDIDATES, DEMO_ME } from '@/data/demo-users';
import { DEMO_VENUES } from '@/data/venues';
import { generateProfileDeterministic, explainDeterministic } from '@/lib/ai/deterministic';
import { evaluateCompatibility } from '@/lib/compatibility/engine';
import type {
  Answer,
  DateFeedback,
  Preferences,
  Proposal,
  TimeOption,
  User,
} from '@/lib/types';
import { meetingPointFor, rankVenues, venueReason } from '@/lib/venues/rank';

/**
 * Client-side demo backbone. Seeds a realistic session and persists to localStorage.
 * In production these actions would call Supabase-backed server routes instead; the
 * component API stays identical so screens don't change.
 */

const nowIso = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);

function inDays(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function withProfiles(user: User): User {
  return { ...user, aiProfile: generateProfileDeterministic(user) };
}

function buildProposal(me: User, candidate: User, seed: Partial<Proposal> = {}): Proposal {
  const compatibility = evaluateCompatibility(me, candidate);
  const explanation = explainDeterministic(me, candidate, compatibility);
  return {
    id: `prop_${candidate.id}`,
    candidateId: candidate.id,
    compatibility,
    explanation,
    expiresAt: inDays(6, 20),
    state: 'waiting_for_interest',
    meInterested: false,
    themInterested: false,
    timeOptions: [],
    counterOptions: [],
    timeline: [{ id: rid(), at: nowIso(), label: 'Proposal created by BOND' }],
    createdAt: nowIso(),
    ...seed,
  };
}

function draftUser(): User {
  return {
    id: 'me',
    displayName: '',
    dob: '',
    city: '',
    lat: 41.3874,
    lng: 2.1686,
    profession: '',
    languages: [],
    intro: '',
    gender: 'woman',
    interests: [],
    photos: [],
    preferences: {
      genders: [],
      minAge: 27,
      maxAge: 40,
      maxDistanceKm: 30,
      intention: 'long_term',
      smoking: 'no_preference',
      drinking: 'no_preference',
      children: 'no_preference',
      languages: [],
      firstRecipientRule: 'either',
      eitherCanInitiate: true,
    },
    answers: [],
    favouriteVenueIds: [],
    aiProfile: null,
    onboardingComplete: false,
    discoveryPaused: false,
    isDemo: true,
  };
}

function seedState(): { me: User; candidates: User[]; proposals: Proposal[] } {
  const me = withProfiles(DEMO_ME);
  const candidates = DEMO_CANDIDATES.map(withProfiles);
  const byId = (id: string) => candidates.find((c) => c.id === id)!;

  const elena = buildProposal(me, byId('elena'));
  const noa = buildProposal(me, byId('noa'));

  // Marc has already shown interest and proposed times — the demo user must respond.
  const marc = buildProposal(me, byId('marc'), {
    state: 'awaiting_time_response',
    meInterested: true,
    themInterested: true,
    timeProposedBy: 'them',
    timeOptions: [
      { id: rid(), start: inDays(3, 20), durationMins: 120 },
      { id: rid(), start: inDays(4, 13), durationMins: 90 },
      { id: rid(), start: inDays(6, 19), durationMins: 120 },
    ],
    timeline: [
      { id: rid(), at: inDays(-2, 10), label: 'Proposal created by BOND' },
      { id: rid(), at: inDays(-1, 18), label: 'Marc showed interest' },
      { id: rid(), at: inDays(-1, 19), label: 'You both showed interest' },
      { id: rid(), at: inDays(0, 9), label: 'Marc proposed 3 time options' },
    ],
  });

  // Diego is a fully confirmed upcoming date.
  const diegoVenue = DEMO_VENUES.find((v) => v.id === 'v_gresca')!;
  const diego = buildProposal(me, byId('diego'), {
    state: 'confirmed',
    meInterested: true,
    themInterested: true,
    timeProposedBy: 'me',
    timeOptions: [{ id: rid(), start: inDays(5, 20), durationMins: 120 }],
    selectedTime: { id: rid(), start: inDays(5, 20), durationMins: 120 },
    venueId: diegoVenue.id,
    venueReason: `BOND picked ${diegoVenue.name} because it's one of your shared favourites and central for you both.`,
    meetingPoint: meetingPointFor(diegoVenue),
    timeline: [
      { id: rid(), at: inDays(-4, 10), label: 'Proposal created by BOND' },
      { id: rid(), at: inDays(-3, 12), label: 'You both showed interest' },
      { id: rid(), at: inDays(-2, 15), label: 'You proposed 3 time options' },
      { id: rid(), at: inDays(-2, 18), label: 'Diego chose a time' },
      { id: rid(), at: inDays(-2, 18), label: `BOND suggested ${diegoVenue.name}` },
      { id: rid(), at: inDays(-1, 9), label: 'Date confirmed' },
    ],
  });

  return { me, candidates, proposals: [elena, noa, marc, diego] };
}

interface DemoState {
  hydrated: boolean;
  seeded: boolean;
  me: User | null;
  candidates: User[];
  proposals: Proposal[];
  blockedIds: string[];
  profileAccuracy: 'accurate' | 'partly' | 'not' | null;

  enterDemo: () => void;
  ensureDraft: () => void;
  finishOnboarding: () => void;
  reset: () => void;
  signOut: () => void;

  updateMe: (patch: Partial<User>) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  setAnswers: (answers: Answer[]) => void;
  regenerateAiProfile: () => void;
  rateProfile: (r: 'accurate' | 'partly' | 'not') => void;
  toggleDiscoveryPause: () => void;

  showInterest: (proposalId: string) => void;
  pass: (proposalId: string) => void;
  proposeTimes: (proposalId: string, options: TimeOption[], by: 'me' | 'them') => void;
  respondToTimes: (
    proposalId: string,
    action: 'accept' | 'counter' | 'decline',
    payload?: TimeOption | TimeOption[],
  ) => void;
  confirmVenue: (proposalId: string) => void;
  cancelDate: (proposalId: string) => void;
  completeDate: (proposalId: string) => void;
  submitFeedback: (proposalId: string, feedback: DateFeedback) => void;
  block: (candidateId: string) => void;
}

function candidateOf(state: DemoState, proposalId: string): User | undefined {
  const p = state.proposals.find((x) => x.id === proposalId);
  return p ? state.candidates.find((c) => c.id === p.candidateId) : undefined;
}

function pushTimeline(p: Proposal, label: string): Proposal {
  return { ...p, timeline: [...p.timeline, { id: rid(), at: nowIso(), label }] };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seeded: false,
      me: null,
      candidates: [],
      proposals: [],
      blockedIds: [],
      profileAccuracy: null,

      enterDemo: () => {
        const { me, candidates, proposals } = seedState();
        set({ me, candidates, proposals, seeded: true, blockedIds: [], profileAccuracy: null });
      },

      ensureDraft: () => {
        if (get().me) return;
        set({ me: { ...draftUser() }, candidates: [], proposals: [], seeded: false });
      },

      finishOnboarding: () => {
        const me = get().me;
        if (!me) return;
        const completed: User = {
          ...me,
          onboardingComplete: true,
          aiProfile: generateProfileDeterministic(me),
        };
        const candidates = DEMO_CANDIDATES.map(withProfiles);
        const proposals = candidates
          .map((c) => buildProposal(completed, c))
          .sort((a, b) => b.compatibility.total - a.compatibility.total);
        set({ me: completed, candidates, proposals, seeded: true });
      },
      reset: () => {
        const { me, candidates, proposals } = seedState();
        set({ me, candidates, proposals, seeded: true, blockedIds: [], profileAccuracy: null });
      },
      signOut: () =>
        set({ me: null, candidates: [], proposals: [], seeded: false, profileAccuracy: null }),

      updateMe: (patch) => set((s) => (s.me ? { me: { ...s.me, ...patch } } : {})),
      updatePreferences: (patch) =>
        set((s) => (s.me ? { me: { ...s.me, preferences: { ...s.me.preferences, ...patch } } } : {})),
      setAnswers: (answers) => set((s) => (s.me ? { me: { ...s.me, answers } } : {})),
      regenerateAiProfile: () =>
        set((s) => (s.me ? { me: { ...s.me, aiProfile: generateProfileDeterministic(s.me) } } : {})),
      rateProfile: (r) => set({ profileAccuracy: r }),
      toggleDiscoveryPause: () =>
        set((s) => (s.me ? { me: { ...s.me, discoveryPaused: !s.me.discoveryPaused } } : {})),

      showInterest: (proposalId) =>
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== proposalId) return p;
            let next = pushTimeline({ ...p, meInterested: true }, 'You showed interest');
            // Demo: the candidate is interested too -> mutual interest.
            if (!next.themInterested) {
              next = pushTimeline({ ...next, themInterested: true }, 'You both showed interest');
            }
            next.state = 'mutual_interest';
            return next;
          }),
        })),

      pass: (proposalId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? pushTimeline({ ...p, state: 'declined', meInterested: false }, 'You passed')
              : p,
          ),
        })),

      proposeTimes: (proposalId, options, by) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? pushTimeline(
                  { ...p, timeOptions: options, timeProposedBy: by, state: 'awaiting_time_response' },
                  by === 'me' ? 'You proposed 3 time options' : 'They proposed 3 time options',
                )
              : p,
          ),
        })),

      respondToTimes: (proposalId, action, payload) =>
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== proposalId) return p;
            if (action === 'decline')
              return pushTimeline({ ...p, state: 'declined' }, 'Time options declined');
            if (action === 'counter') {
              const counter = Array.isArray(payload) ? payload : [];
              return pushTimeline(
                { ...p, counterOptions: counter, timeProposedBy: 'me', state: 'awaiting_time_response' },
                'You suggested alternative times',
              );
            }
            // accept
            const chosen = Array.isArray(payload) ? payload[0] : payload;
            if (!chosen) return p;
            return pushTimeline(
              { ...p, selectedTime: chosen, state: 'selecting_venue' },
              'A time was selected',
            );
          }),
        })),

      confirmVenue: (proposalId) =>
        set((s) => {
          const cand = candidateOf(s, proposalId);
          if (!s.me || !cand) return {};
          const p = s.proposals.find((x) => x.id === proposalId);
          if (!p) return {};
          const ranked = rankVenues(s.me, cand, DEMO_VENUES, p.selectedTime?.start)[0];
          if (!ranked) return {};
          return {
            proposals: s.proposals.map((x) =>
              x.id === proposalId
                ? pushTimeline(
                    {
                      ...x,
                      venueId: ranked.venue.id,
                      venueReason: venueReason(ranked),
                      meetingPoint: meetingPointFor(ranked.venue),
                      state: 'confirmed',
                    },
                    `BOND suggested ${ranked.venue.name} — date confirmed`,
                  )
                : x,
            ),
          };
        }),

      cancelDate: (proposalId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId ? pushTimeline({ ...p, state: 'cancelled' }, 'Date cancelled') : p,
          ),
        })),

      completeDate: (proposalId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId ? pushTimeline({ ...p, state: 'completed' }, 'Date completed') : p,
          ),
        })),

      submitFeedback: (proposalId, feedback) =>
        set((s) => ({
          proposals: s.proposals.map((p) => (p.id === proposalId ? { ...p, feedback } : p)),
        })),

      block: (candidateId) =>
        set((s) => ({
          blockedIds: [...new Set([...s.blockedIds, candidateId])],
          proposals: s.proposals.map((p) =>
            p.candidateId === candidateId
              ? pushTimeline({ ...p, state: 'declined' }, 'User blocked')
              : p,
          ),
        })),
    }),
    {
      name: 'bond-demo',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** Convenience selectors used by screens. */
export function candidateById(id: string): User | undefined {
  return ALL_DEMO_USERS.find((u) => u.id === id);
}
