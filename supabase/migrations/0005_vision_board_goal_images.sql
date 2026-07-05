-- Migration: vision-board hero image + goal-tagged images + weekly real-story cache.
-- Idempotent — safe to re-run.
-- Paste the CONTENTS of this file into the Supabase SQL editor (not the file path).

-- 1) Storage bucket for uploaded vision-board / goal images.
--    Public so the browser can render the returned URL directly; object paths are
--    randomized (unguessable) at upload time. Server writes use the service-role
--    key, so these policies mainly future-proof an anon-key switch.
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

-- 2) Single vision-board hero image, stored on the existing one-row identity table.
alter table identity add column if not exists vision_board_url text;

-- 3) Tag a pinned board image to a specific goal (drives the "Why I'm doing this" strip).
alter table manifestations add column if not exists goal_id uuid references goals(id) on delete set null;
create index if not exists manifestations_goal_idx on manifestations(goal_id);

-- 4) Weekly cache of the Leo-picked REAL-person story per (week, mood).
--    Generated once per week per mood, reused on every load — stable + cheap,
--    and lets us vet realness once rather than on each render.
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
