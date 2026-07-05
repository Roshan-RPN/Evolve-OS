-- Life OS schema. Run this in the Supabase SQL editor for your project.
-- Single-user app: no row-level auth split, passcode gate happens at the app layer.

create extension if not exists "pgcrypto";

-- One row: 3yr/1yr vision + future identity
create table if not exists identity (
  id uuid primary key default gen_random_uuid(),
  vision_3_year text,
  vision_1_year text,
  future_identity_traits text,
  future_identity_behaviors text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row: full onboarding context the AI references before generating anything
create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  who_you_are_now text,
  strengths text,
  weaknesses text,
  past_patterns text,
  motivation text,
  fears text,
  capacity_check text,
  energy_pattern text,
  feedback_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3-year / yearly / monthly / weekly goal cascade
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('three_year', 'yearly', 'monthly', 'weekly')),
  period text not null, -- '2029', '2026', '2026-07', '2026-W27'
  parent_id uuid references goals(id) on delete set null,
  content text not null,
  action text,          -- weekly rows: the concrete action for that day
  day_index smallint,   -- weekly rows: 0=Mon … 6=Sun
  done boolean not null default false,
  rank int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_period_idx on goals(level, period);

-- One saved end-of-week evaluation per week
create table if not exists weekly_reviews (
  period text primary key, -- '2026-W27'
  completion numeric not null default 0,
  planned int not null default 0,
  done_count int not null default 0,
  verdict text,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily plan submitted each morning
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  top_priorities jsonb not null default '[]',
  todo jsonb not null default '[]',
  schedule jsonb not null default '[]',
  ai_critique text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per day: morning + evening journal blocks
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  morning jsonb, -- affirmations, energy, gratitude, mood_score, etc.
  evening jsonb, -- story_moment, mistakes, better_tomorrow, gratitude, energy_leak, self_respect_score, win, first_move
  ai_morning_story text,
  ai_realization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habit stack: identity (non-negotiable), single active stretch habit, backlog
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('identity', 'stretch', 'backlog')),
  status text not null default 'active' check (status in ('active', 'backlog', 'archived')),
  streak int not null default 0,
  best_streak int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mid-day check-in pings and tap responses
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  scheduled_at timestamptz not null default now(),
  responded_at timestamptz,
  prompt text not null,
  linked_priority text,
  habit_id uuid references habits(id) on delete set null,
  response text check (response in ('done', 'partial', 'skipped')),
  mood text check (mood in ('good', 'low', 'stuck', 'confused')),
  follow_up_story text,
  created_at timestamptz not null default now()
);

-- Daily completion per habit, auto-marked from checkins/evening journal
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  source text not null default 'manual' check (source in ('checkin', 'evening', 'manual')),
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Append-only: AI-detected say-vs-do patterns
create table if not exists patterns (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  category text,
  created_at timestamptz not null default now()
);

-- Weekly audits + monthly reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('weekly', 'monthly')),
  period text not null, -- '2026-W27' or '2026-07'
  content text not null,
  created_at timestamptz not null default now()
);

-- Confusion Dump: raw thoughts the coach untangles instantly
create table if not exists thoughts (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'confusion' check (kind in ('confusion', 'idea', 'note')),
  content text not null,
  ai_response text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists thoughts_date_idx on thoughts(date desc);

-- Manifestation board: vision-board entries (image + caption) the user pins,
-- rendered as a stories-style feed. Nightly AI visualizations live in
-- journal_entries.evening.manifestation and are surfaced alongside these.
create table if not exists manifestations (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'vision' check (kind in ('vision', 'proof', 'affirmation')),
  caption text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists manifestations_created_idx on manifestations(created_at desc);

-- Web push subscriptions (single user, but may have multiple devices)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
