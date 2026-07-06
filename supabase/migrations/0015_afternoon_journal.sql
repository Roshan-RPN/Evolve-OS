-- Afternoon journal: a midday "reset" block stored on the same journal_entries
-- row as morning + evening. Holds on-track score, energy, per-priority progress,
-- the drift the user named, their honest line, the refocus, and Leo's midday nudge.
-- Idempotent — safe to re-run. Paste the CONTENTS into the Supabase SQL editor.
alter table journal_entries add column if not exists afternoon jsonb;
