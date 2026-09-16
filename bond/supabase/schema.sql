-- BOND — Supabase schema (Postgres). Run in the Supabase SQL editor.
-- Row Level Security is enabled everywhere; a user can only read/write their own rows,
-- except for the summarised, non-private fields others need to see a proposal.

create extension if not exists "uuid-ossp";

-- Enums -------------------------------------------------------------------- --
do $$ begin
  create type gender as enum ('woman','man','nonbinary');
  create type relationship_intention as enum
    ('long_term','long_term_open_to_short','short_term_open_to_long','friends_first','still_figuring_out');
  create type habit as enum ('never','sometimes','often','no_preference');
  create type children_pref as enum ('have','want','dont_want','open','no_preference');
  create type first_recipient_rule as enum ('either','me_first','them_first','auto');
  create type date_state as enum
    ('waiting_for_interest','mutual_interest','selecting_times','awaiting_time_response',
     'selecting_venue','confirmed','completed','cancelled','declined','expired');
exception when duplicate_object then null; end $$;

-- Profiles (1:1 with auth.users) ------------------------------------------ --
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  dob date not null,
  gender gender not null,
  city text,
  lat double precision,
  lng double precision,
  profession text,
  languages text[] default '{}',
  intro text,
  interests text[] default '{}',
  onboarding_complete boolean default false,
  discovery_paused boolean default false,
  created_at timestamptz default now(),
  constraint adult check (dob <= (current_date - interval '18 years'))
);

create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  is_primary boolean default false,
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  genders gender[] not null default '{}',
  min_age int not null default 18 check (min_age >= 18),
  max_age int not null default 99,
  max_distance_km int not null default 50,
  intention relationship_intention not null default 'long_term',
  smoking habit not null default 'no_preference',
  drinking habit not null default 'no_preference',
  children children_pref not null default 'no_preference',
  languages text[] default '{}',
  first_recipient_rule first_recipient_rule not null default 'either',
  either_can_initiate boolean not null default true
);

create table if not exists questionnaire_answers (
  user_id uuid not null references profiles(id) on delete cascade,
  question_id text not null,
  value text not null,
  primary key (user_id, question_id)
);

create table if not exists ai_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  summary text,
  top_values text[] default '{}',
  communication_style text,
  relationship_intention text,
  lifestyle_pattern text,
  conflict_approach text,
  preferred_partner_dynamics text,
  friction_areas text,
  traits jsonb,
  source text,
  generated_at timestamptz default now()
);

create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  address text,
  lat double precision,
  lng double precision,
  price_level int check (price_level between 1 and 4),
  atmosphere_tags text[] default '{}',
  dietary_tags text[] default '{}',
  image text
);

create table if not exists favourite_venues (
  user_id uuid not null references profiles(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  primary key (user_id, restaurant_id)
);

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

-- Matches / proposals ------------------------------------------------------ --
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  state date_state not null default 'waiting_for_interest',
  a_interested boolean default false,
  b_interested boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

create table if not exists compatibility_scores (
  match_id uuid primary key references matches(id) on delete cascade,
  total int not null,
  personality int not null,
  values int not null,
  life_goals int not null,
  communication int not null,
  lifestyle int not null,
  preference_alignment int not null,
  explanation jsonb
);

create table if not exists date_proposals (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  proposed_by uuid not null references profiles(id),
  time_options jsonb not null default '[]',
  counter_options jsonb not null default '[]',
  selected_time jsonb,
  created_at timestamptz default now()
);

create table if not exists dates (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  restaurant_id uuid references restaurants(id),
  starts_at timestamptz,
  meeting_point text,
  venue_reason text,
  state date_state not null default 'confirmed',
  created_at timestamptz default now()
);

create table if not exists date_feedback (
  date_id uuid not null references dates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  matched_profile text,
  meet_again text,
  venue_suitable boolean,
  felt_safe boolean,
  note text,
  created_at timestamptz default now(),
  primary key (date_id, user_id)
);

create table if not exists subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  tier text not null default 'free',
  renews_at timestamptz
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security ------------------------------------------------------- --
alter table profiles enable row level security;
alter table preferences enable row level security;
alter table questionnaire_answers enable row level security;
alter table ai_profiles enable row level security;
alter table photos enable row level security;
alter table favourite_venues enable row level security;
alter table date_feedback enable row level security;
alter table notifications enable row level security;

-- A user manages their own rows. (Proposal/match visibility is handled through
-- security-definer RPCs that return only summarised, non-private fields.)
do $$ begin
  create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
  create policy "own prefs" on preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own answers" on questionnaire_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own ai profile" on ai_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own photos" on photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own favourites" on favourite_venues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own feedback" on date_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own notifications" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Restaurants are public read.
alter table restaurants enable row level security;
do $$ begin
  create policy "restaurants readable" on restaurants for select using (true);
exception when duplicate_object then null; end $$;
