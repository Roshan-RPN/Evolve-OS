-- ONE-PASTE CATCH-UP: migrations 0002 → 0008 combined, in order.
-- Your database only has 0001 applied. Paste this WHOLE file into the
-- Supabase SQL editor (Dashboard → SQL Editor → New query) and press Run.
-- Every statement is idempotent — safe to re-run if it half-fails.

-- ---------- 0002: goal parent link ----------
alter table goals
  add column if not exists parent_id uuid references goals(id) on delete set null;

-- ---------- 0003: weekly day actions + weekly_reviews ----------
alter table goals
  add column if not exists action text;

alter table goals
  add column if not exists day_index smallint; -- 0=Mon … 6=Sun, weekly rows only

create table if not exists weekly_reviews (
  period text primary key,            -- '2026-W27'
  completion numeric not null default 0, -- 0..1 done/planned
  planned int not null default 0,
  done_count int not null default 0,
  verdict text,                       -- Leo's blunt evaluation
  stats jsonb not null default '{}',  -- { gaps: [{weekday, goal}] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 0004: manifestation ritual log + habit stacking ----------
create table if not exists vision_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  focus text not null default '1yr'
    check (focus in ('3yr', '1yr', 'first_move', 'affirmation')),
  vividness int not null default 5,
  body_location text,
  felt_note text,
  created_at timestamptz not null default now()
);
create index if not exists vision_sessions_created_idx on vision_sessions(created_at desc);

alter table habits add column if not exists anchor text;
alter table habits add column if not exists time_of_day text not null default 'anytime';
alter table habits add column if not exists origin text not null default 'self';

alter table habits drop constraint if exists habits_time_of_day_check;
alter table habits
  add constraint habits_time_of_day_check
  check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime'));

alter table habits drop constraint if exists habits_origin_check;
alter table habits
  add constraint habits_origin_check
  check (origin in ('self', 'leo'));

-- ---------- 0005: vision board + goal images + mood story cache ----------
insert into storage.buckets (id, name, public)
values ('vision-board', 'vision-board', true)
on conflict (id) do nothing;

drop policy if exists "vision_board_read" on storage.objects;
create policy "vision_board_read" on storage.objects
  for select using (bucket_id = 'vision-board');

drop policy if exists "vision_board_write" on storage.objects;
create policy "vision_board_write" on storage.objects
  for insert with check (bucket_id = 'vision-board');

drop policy if exists "vision_board_delete" on storage.objects;
create policy "vision_board_delete" on storage.objects
  for delete using (bucket_id = 'vision-board');

alter table identity add column if not exists vision_board_url text;

alter table manifestations add column if not exists goal_id uuid references goals(id) on delete set null;
create index if not exists manifestations_goal_idx on manifestations(goal_id);

create table if not exists mood_stories (
  id uuid primary key default gen_random_uuid(),
  week text not null,          -- ISO week key, e.g. '2026-W27'
  mood text not null,          -- MOODS id, e.g. 'lost-belief'
  name text not null,
  field text,
  headline text,
  body jsonb not null default '[]',
  lesson text,
  source text not null default 'leo' check (source in ('leo', 'curated')),
  created_at timestamptz not null default now(),
  unique (week, mood)
);
create index if not exists mood_stories_week_idx on mood_stories(week);

-- ---------- 0006: habit minutes ----------
alter table habit_logs add column if not exists minutes integer
  check (minutes is null or (minutes >= 0 and minutes <= 1440));

alter table habits add column if not exists target_minutes integer
  check (target_minutes is null or (target_minutes >= 0 and target_minutes <= 1440));

-- ---------- 0007: habit icons ----------
alter table habits add column if not exists icon text;

-- ---------- 0008: multi-user profiles ----------
create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  passcode_hash text not null, -- sha256("<passcode>:<AUTH_SECRET>"), or 'env' for the owner
  created_at timestamptz not null default now()
);

-- Fixed owner id: existing single-user data is claimed by this profile.
insert into app_users (id, name, passcode_hash)
values ('00000000-0000-0000-0000-000000000001', 'Owner', 'env')
on conflict (id) do nothing;

-- user_id on every data table, defaulting to the owner so existing rows are claimed.
alter table identity           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table profile            add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table goals              add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table weekly_reviews     add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table plans              add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table journal_entries    add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table habits             add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table checkins           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table habit_logs         add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table patterns           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table reviews            add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table thoughts           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table manifestations     add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table vision_sessions    add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table mood_stories       add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table push_subscriptions add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;

-- Per-day / per-period uniques must now be per-user.
alter table plans drop constraint if exists plans_date_key;
drop index if exists plans_user_date_key;
create unique index plans_user_date_key on plans(user_id, date);

alter table journal_entries drop constraint if exists journal_entries_date_key;
drop index if exists journal_entries_user_date_key;
create unique index journal_entries_user_date_key on journal_entries(user_id, date);

-- weekly_reviews was keyed on period alone; re-key on (user_id, period).
alter table weekly_reviews drop constraint if exists weekly_reviews_pkey;
alter table weekly_reviews add primary key (user_id, period);

alter table mood_stories drop constraint if exists mood_stories_week_mood_key;
drop index if exists mood_stories_user_week_mood_key;
create unique index mood_stories_user_week_mood_key on mood_stories(user_id, week, mood);

-- Speed up the per-user scans every page does.
create index if not exists goals_user_idx on goals(user_id, level, period);
create index if not exists habits_user_idx on habits(user_id);
create index if not exists habit_logs_user_date_idx on habit_logs(user_id, date);
create index if not exists checkins_user_date_idx on checkins(user_id, date);
create index if not exists thoughts_user_idx on thoughts(user_id, date desc);
create index if not exists manifestations_user_idx on manifestations(user_id, created_at desc);
create index if not exists vision_sessions_user_idx on vision_sessions(user_id, created_at desc);
