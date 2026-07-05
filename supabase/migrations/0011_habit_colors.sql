-- 0011: per-habit accent colour, chosen when building the habit.
-- Stores a palette key from lib/habit-colors.ts (not a raw hex) so the
-- palette can be tuned later without touching saved rows.
alter table habits add column if not exists color text;
