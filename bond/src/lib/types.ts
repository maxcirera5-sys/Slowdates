import { z } from 'zod';

// --------------------------------------------------------------------------- //
// Enums / unions
// --------------------------------------------------------------------------- //
export const GENDERS = ['woman', 'man', 'nonbinary'] as const;
export const genderSchema = z.enum(GENDERS);
export type Gender = z.infer<typeof genderSchema>;

export const RELATIONSHIP_INTENTIONS = [
  'long_term',
  'long_term_open_to_short',
  'short_term_open_to_long',
  'friends_first',
  'still_figuring_out',
] as const;
export const relationshipIntentionSchema = z.enum(RELATIONSHIP_INTENTIONS);
export type RelationshipIntention = z.infer<typeof relationshipIntentionSchema>;

export const HABIT = ['never', 'sometimes', 'often', 'no_preference'] as const;
export const habitSchema = z.enum(HABIT);
export type Habit = z.infer<typeof habitSchema>;

export const CHILDREN = ['have', 'want', 'dont_want', 'open', 'no_preference'] as const;
export const childrenSchema = z.enum(CHILDREN);

export const FIRST_RECIPIENT_RULE = ['either', 'me_first', 'them_first', 'auto'] as const;
export const firstRecipientRuleSchema = z.enum(FIRST_RECIPIENT_RULE);
export type FirstRecipientRule = z.infer<typeof firstRecipientRuleSchema>;

// --------------------------------------------------------------------------- //
// Questionnaire
// --------------------------------------------------------------------------- //
export const QUESTION_CATEGORIES = [
  'personality',
  'values',
  'ambition',
  'communication',
  'conflict',
  'lifestyle',
  'expectations',
  'future',
] as const;
export const questionCategorySchema = z.enum(QUESTION_CATEGORIES);
export type QuestionCategory = z.infer<typeof questionCategorySchema>;

export type QuestionType = 'scale' | 'single' | 'scenario' | 'ranked';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  type: QuestionType;
  prompt: string;
  /** For single/scenario/ranked. Scale questions render a fixed 1–5 agreement scale. */
  options?: QuestionOption[];
  /** Which engine dimension this question feeds. */
  dimension: CompatibilityDimension;
  /** For scale questions: does agreement push the dimension score up (+1) or down (-1)? */
  polarity?: 1 | -1;
}

/** value: for scale -> "1".."5"; single/scenario -> option value; ranked -> ordered csv */
export const answerSchema = z.object({
  questionId: z.string(),
  value: z.string(),
});
export type Answer = z.infer<typeof answerSchema>;

// --------------------------------------------------------------------------- //
// Compatibility
// --------------------------------------------------------------------------- //
export const COMPATIBILITY_DIMENSIONS = [
  'personality',
  'values',
  'lifeGoals',
  'communication',
  'lifestyle',
] as const;
export type CompatibilityDimension = (typeof COMPATIBILITY_DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<CompatibilityDimension, number> = {
  personality: 0.3,
  values: 0.25,
  lifeGoals: 0.2,
  communication: 0.15,
  lifestyle: 0.1,
};

export interface CategoryScores {
  personality: number;
  values: number;
  lifeGoals: number;
  communication: number;
  lifestyle: number;
}

export interface CompatibilityResult {
  eligible: boolean;
  ineligibleReasons: string[];
  total: number; // 0–100
  categories: CategoryScores;
  preferenceAlignment: number; // 0–100, declared-preference signal (never photo-based)
}

export interface CompatibilityExplanation {
  alignmentPoints: [string, string, string];
  potentialDifference: string;
  conversationTopic: string;
  source: 'openai' | 'deterministic';
}

// --------------------------------------------------------------------------- //
// Profiles / preferences
// --------------------------------------------------------------------------- //
export interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  isDemo?: boolean;
}

export interface Preferences {
  genders: Gender[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  intention: RelationshipIntention;
  smoking: Habit;
  drinking: Habit;
  children: z.infer<typeof childrenSchema>;
  languages: string[];
  firstRecipientRule: FirstRecipientRule;
  eitherCanInitiate: boolean;
}

export interface AiTraits {
  openness: number;
  sociability: number;
  empathy: number;
  planning: number;
  ambition: number;
}

export interface AiProfile {
  summary: string;
  topValues: string[];
  communicationStyle: string;
  relationshipIntention: string;
  lifestylePattern: string;
  conflictApproach: string;
  preferredPartnerDynamics: string;
  frictionAreas: string;
  traits: AiTraits;
  source: 'openai' | 'deterministic';
  generatedAt: string;
}

export interface User {
  id: string;
  displayName: string;
  dob: string; // ISO
  city: string;
  lat: number;
  lng: number;
  profession: string;
  languages: string[];
  intro: string;
  gender: Gender;
  interests: string[];
  photos: Photo[];
  preferences: Preferences;
  answers: Answer[];
  favouriteVenueIds: string[];
  aiProfile: AiProfile | null;
  onboardingComplete: boolean;
  discoveryPaused: boolean;
  isDemo?: boolean;
}

// --------------------------------------------------------------------------- //
// Venues
// --------------------------------------------------------------------------- //
export interface Venue {
  id: string;
  name: string;
  category: 'restaurant' | 'cafe' | 'bar' | 'wine_bar';
  address: string;
  lat: number;
  lng: number;
  priceLevel: 1 | 2 | 3 | 4;
  atmosphereTags: string[];
  dietaryTags: string[];
  image: string;
  isDemo?: boolean;
}

// --------------------------------------------------------------------------- //
// Proposals / dates
// --------------------------------------------------------------------------- //
export type DateState =
  | 'waiting_for_interest'
  | 'mutual_interest'
  | 'selecting_times'
  | 'awaiting_time_response'
  | 'selecting_venue'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'expired';

export interface TimeOption {
  id: string;
  start: string; // ISO
  durationMins: number;
}

export interface TimelineEvent {
  id: string;
  at: string;
  label: string;
}

export interface DateFeedback {
  matchedProfile: 'yes' | 'somewhat' | 'no';
  meetAgain: 'yes' | 'maybe' | 'no';
  venueSuitable: boolean;
  feltSafe: boolean;
  note?: string;
}

export interface Proposal {
  id: string;
  /** The other person shown to the current demo user. */
  candidateId: string;
  compatibility: CompatibilityResult;
  explanation: CompatibilityExplanation;
  expiresAt: string;
  state: DateState;
  /** Interest is stored privately per side. */
  meInterested: boolean;
  themInterested: boolean;
  /** Whoever proposed the time options. */
  timeProposedBy?: 'me' | 'them';
  timeOptions: TimeOption[];
  counterOptions: TimeOption[];
  selectedTime?: TimeOption;
  venueId?: string;
  venueReason?: string;
  meetingPoint?: string;
  timeline: TimelineEvent[];
  feedback?: DateFeedback;
  createdAt: string;
}

// --------------------------------------------------------------------------- //
// Form schemas (React Hook Form + Zod)
// --------------------------------------------------------------------------- //
export const basicsSchema = z.object({
  displayName: z.string().min(2, 'Introduce tu nombre').max(40),
  dob: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha no válida')
    .refine((v) => {
      const d = new Date(v);
      const eighteen = new Date();
      eighteen.setFullYear(eighteen.getFullYear() - 18);
      return d <= eighteen;
    }, 'Debes tener al menos 18 años'),
  city: z.string().min(2, 'Introduce tu ciudad'),
  profession: z.string().min(2, 'Introduce tu profesión'),
  languages: z.array(z.string()).min(1, 'Selecciona al menos un idioma'),
  intro: z.string().min(20, 'Cuenta algo más (mín. 20 caracteres)').max(400),
});
export type BasicsForm = z.infer<typeof basicsSchema>;

export const preferencesSchema = z.object({
  genders: z.array(genderSchema).min(1, 'Selecciona al menos una opción'),
  minAge: z.number().int().min(18).max(99),
  maxAge: z.number().int().min(18).max(99),
  maxDistanceKm: z.number().int().min(1).max(300),
  intention: relationshipIntentionSchema,
  smoking: habitSchema,
  drinking: habitSchema,
  children: childrenSchema,
  languages: z.array(z.string()),
  firstRecipientRule: firstRecipientRuleSchema,
  eitherCanInitiate: z.boolean(),
}).refine((v) => v.maxAge >= v.minAge, {
  message: 'La edad máxima debe ser mayor o igual que la mínima',
  path: ['maxAge'],
});
export type PreferencesForm = z.infer<typeof preferencesSchema>;
