-- Migration: guided manifestation ritual log + real habit stacking.
-- Idempotent — safe to re-run.

-- 1) Felt-sense log for the guided visualization ritual AND the evening sensory step.
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

-- 2) Habit stacking: an anchor cue ("after X"), a time-of-day group, and whether
--    the habit was written by the user or suggested by Leo.
alter table habits add column if not exists anchor text;
alter table habits add column if not exists time_of_day text not null default 'anytime';
alter table habits add column if not exists origin text not null default 'self';

-- Constrain the new text columns (drop-then-add so re-runs stay clean).
alter table habits drop constraint if exists habits_time_of_day_check;
alter table habits
  add constraint habits_time_of_day_check
  check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime'));

alter table habits drop constraint if exists habits_origin_check;
alter table habits
  add constraint habits_origin_check
  check (origin in ('self', 'leo'));
