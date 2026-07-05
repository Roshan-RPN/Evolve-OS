-- Migration for existing databases: 3-year goals level, goal done flag,
-- and the manifestation board table. Idempotent — safe to re-run.

-- 1) Widen the goals.level check to include 'three_year'
alter table goals drop constraint if exists goals_level_check;
alter table goals
  add constraint goals_level_check
  check (level in ('three_year', 'yearly', 'monthly', 'weekly'));

-- 2) Add a done flag so monthly/weekly goals can be checked off
alter table goals add column if not exists done boolean not null default false;

-- 3) Manifestation board
create table if not exists manifestations (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'vision' check (kind in ('vision', 'proof', 'affirmation')),
  caption text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists manifestations_created_idx on manifestations(created_at desc);
