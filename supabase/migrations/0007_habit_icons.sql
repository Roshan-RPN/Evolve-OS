-- Custom icon per habit: stores a key from lib/habit-icons.ts (e.g. 'gym', 'read').
-- Null = auto-pick from the habit name. Paste into the Supabase SQL editor and Run.
-- Idempotent.

alter table habits add column if not exists icon text;
