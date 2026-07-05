-- Live demo data for Evolve OS.
-- Paste the CONTENTS of this file into the Supabase SQL editor and Run.
-- Idempotent: re-running replaces the demo rows, it does not stack duplicates.
-- Everything is relative to current_date, so "yesterday / previous days" is real.
--
-- Seeds:
--   * 8 tracked habits (7 identity + 1 stretch)  -> answers "how do 8 habits show up"
--   * 3 backlog habits (the "habit stack")        -> Habits page stack to promote
--   * 14 days of habit_logs with varied streaks   -> heatmap, bars, favorites, streaks
--   * 12 days of morning+evening journal          -> energy/self-respect trend + journaled days
--   * 3 days of locked daily plans (today+2)       -> Home: morning done, schedule, priorities
--   * 7 days of check-ins with responses + moods   -> follow-through rate; today = low (mood story)
-- Reflects across Home, Analytics, Habits and Schedule.

begin;

-- ---- clean previous demo rows (scoped, safe) --------------------------------
delete from checkins where follow_up_story = 'seed';
delete from plans where date >= current_date - 2 and locked = true
  and top_priorities ? 'Ship the landing page';
delete from habits where name in (
  'Meditate 10 min','Read 20 pages','Workout','No sugar',
  'Deep work 2h','Lights out by 11','Journal','Cold shower',
  'Wake at 5:30','Walk 8k steps','Weekly review'
); -- cascades habit_logs

-- ---- 8 habits + 14 days of logs (with time) --------------------------------
-- NOTE: minutes / target_minutes require migration 0006. Run that first.
with new_habits as (
  insert into habits (name, type, status, sort_order, streak, best_streak, target_minutes) values
    ('Meditate 10 min',    'identity', 'active', 1, 9, 12,  15),
    ('Read 20 pages',      'identity', 'active', 2, 8, 11,  25),
    ('Workout',            'identity', 'active', 3, 7, 14,  45),
    ('No sugar',           'identity', 'active', 4, 6,  9, null),
    ('Deep work 2h',       'identity', 'active', 5, 5, 10, 120),
    ('Lights out by 11',   'identity', 'active', 6, 9, 13, null),
    ('Journal',            'identity', 'active', 7, 8, 12,  10),
    ('Cold shower',        'stretch',  'active', 8, 7, 10,   5)
  returning id, sort_order, target_minutes
),
days as (select generate_series(0, 13) as off)
insert into habit_logs (habit_id, date, completed, source, minutes)
select
  h.id,
  current_date - d.off,
  -- recent 5 days always done (clean current streak); older days miss on a
  -- per-habit cadence so totals / heatmap / best-streak all vary.
  not (d.off >= 5 and ((d.off + h.sort_order) % 5) = 0),
  'manual',
  -- log the habit's target duration on days it was completed (varies the time chart)
  case
    when not (d.off >= 5 and ((d.off + h.sort_order) % 5) = 0) and h.target_minutes is not null
      then h.target_minutes + ((d.off * 7 + h.sort_order) % 3) * 5
    else null
  end
from new_habits h cross join days d
on conflict (habit_id, date) do update
  set completed = excluded.completed, source = excluded.source, minutes = excluded.minutes;

-- ---- 3 backlog habits (the "habit stack" waiting to be promoted) ------------
insert into habits (name, type, status, sort_order) values
  ('Wake at 5:30',   'backlog', 'backlog', 9),
  ('Walk 8k steps',  'backlog', 'backlog', 10),
  ('Weekly review',  'backlog', 'backlog', 11);

-- ---- 3 locked daily plans (today + 2 prior): priorities, todo, schedule -----
-- top_priorities MATCH the seeded check-ins so createCheckinsFromTodayPlan()
-- (which Home runs) dedupes instead of adding a second copy.
insert into plans (date, top_priorities, todo, schedule, locked)
select
  current_date - off,
  '["Ship the landing page","Train legs","Write 500 words"]'::jsonb,
  '["Reply to 3 emails","Prep tomorrow''s deep-work block"]'::jsonb,
  '[
    {"time":"06:00","block":"Meditate + plan the day","priority":1},
    {"time":"09:00","block":"Deep work: ship the landing page","priority":1},
    {"time":"13:00","block":"Train legs","priority":2},
    {"time":"16:00","block":"Write 500 words","priority":2},
    {"time":"21:30","block":"Evening reflection + lights out","priority":3}
  ]'::jsonb,
  true
from generate_series(0, 2) as off
on conflict (date) do update
  set top_priorities = excluded.top_priorities,
      todo = excluded.todo,
      schedule = excluded.schedule,
      locked = excluded.locked;

-- ---- 12 days of journal (morning energy + evening self-respect) -------------
insert into journal_entries (date, morning, evening)
select
  current_date - off,
  jsonb_build_object(
    'energy', 5 + ((13 - off) % 5),
    'emotion', (array['calm','driven','tired','focused','anxious'])[1 + (off % 5)],
    'gratitude', 'Small wins are compounding.'
  ),
  jsonb_build_object(
    'self_respect_score', 5 + ((13 - off) % 4),
    'win', 'Showed up even when it was boring.',
    'first_move', 'Open the file first thing, no phone.',
    'manifestation',
      case when off in (0,2,5)
        then 'You walk in already the person who does this daily. It is not a stretch anymore — it is who you are.'
        else null end
  )
from generate_series(0, 13) as off
where off not in (4, 11)   -- two missed journal days -> "12/14 days journaled"
on conflict (date) do update
  set morning = excluded.morning, evening = excluded.evening;

-- ---- 7 days of check-ins (follow-through + mood) ----------------------------
-- 3 priorities/day. response cycles done/partial/skipped; mood trends up,
-- today (off 0) is 'low' so the Manifestation mood-story card surfaces.
insert into checkins (date, prompt, linked_priority, response, mood, responded_at, follow_up_story)
select
  current_date - off,
  'Did you do: "' || p.priority || '"?',
  p.priority,
  (array['done','done','partial','done','skipped','partial','done'])[1 + ((off + p.n) % 7)],
  case when off = 0 then 'low'
       else (array['good','good','stuck','good','confused','good'])[1 + (off % 6)] end,
  now() - (off || ' days')::interval,
  'seed'
from generate_series(0, 6) as off
cross join (values
  (0, 'Ship the landing page'),
  (1, 'Train legs'),
  (2, 'Write 500 words')
) as p(n, priority);

commit;

-- After running: open /analytics (14-day window), /habits (streak dots),
-- and /manifestation (today's low mood surfaces a real-person story card).
