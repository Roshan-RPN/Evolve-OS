-- Weekly redesign: each weekday holds one goal + one action, marked done.
-- Adds per-day fields to goals and a table to persist end-of-week evaluations.
-- Idempotent — safe to re-run.

alter table goals
  add column if not exists action text;

alter table goals
  add column if not exists day_index smallint; -- 0=Mon … 6=Sun, weekly rows only

-- One saved evaluation per week (auto-scored when a week rolls over, or on demand).
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
