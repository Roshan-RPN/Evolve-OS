-- Time-tracking for habits: optional minutes logged per completion.
-- Binary completion is unchanged; minutes is nullable (done-but-untimed = null).
-- Paste the CONTENTS of this file into the Supabase SQL editor and Run.
-- Idempotent.

alter table habit_logs add column if not exists minutes integer
  check (minutes is null or (minutes >= 0 and minutes <= 1440));

-- Optional per-habit default duration, so timed habits can pre-fill a sensible
-- chip and the "time spent" charts have something to expect. Null = untimed.
alter table habits add column if not exists target_minutes integer
  check (target_minutes is null or (target_minutes >= 0 and target_minutes <= 1440));
