# Evolve OS — Evolution Log

The story of how this app began, everything that changed, what got introduced,
which bugs were fixed, and where it stands now. Built from the full git history
(17 commits, 6–7 July 2026) plus the database migration trail (0001 → 0016).

- **What it is:** a personal Life OS — a PWA (installable web app) that runs your
  day: morning journal, midday reset, evening journal, habits, goals, schedule,
  check-ins, manifestation board, analytics, and an AI coach named **Leo**.
- **Stack:** Modified Next.js 16 (App Router, Turbopack), Supabase (Postgres),
  web-push notifications, Google Gemini for the AI coach, deployed on Vercel.

---

## 1. The beginning — first clean build

**`db006fb` · Evolve OS: clean multi-user build for Vercel** *(6 Jul)*

The whole app landed in one foundational commit — 124 files, ~25,600 lines. This
was the "version 1" everything else builds on. What shipped:

**Core daily flow**
- Morning journal wizard, Evening journal wizard
- Schedule board + day planner
- Habits tracker (streaks, logging, icons, colors, minutes)
- Goals board + planning
- Check-ins (quick midday prompts)
- Manifestation / vision board
- Untangle board (thought dump / mind clearing)
- Analytics dashboard + charts

**Platform pieces**
- Accounts: register / login / logout, isolated per-user data
- AI coach **Leo** (Gemini-backed) with a coach avatar
- Push notifications (service worker + subscribe endpoint)
- Cron reminders endpoint (morning / checkin / evening)
- PWA manifest, app icons, offline shell
- Stories, daily quotes, onboarding questionnaire

**Also fixed in this first cut**
- Schedule was showing the *same* data across different days → fixed by
  remounting the board per date.
- New solid-color "Sora" wordmark (dropped the gradient).
- Every signup now gets its own isolated account + onboarding.

**Database at launch:** migrations `0001`–`0012` established goals/planning/
manifestation, goal parent links, weekly day-actions, ritual + habit stacks,
vision-board images, habit minutes/icons, the **multi-user** model, user email,
profile extras, and habit colors.

---

## 2. Security hardening

**`b020a6f` · Security hardening** *(6 Jul)*

First major pass after launch — locking the multi-user app down:
- **IDOR fix:** `ownsHabit()` ownership check on habit toggle/log/streak (stops
  one user acting on another user's data).
- **Upload safety:** vision-board uploads now require auth, cap at 8 MB, allow
  only whitelisted extensions, and force a safe content-type.
- **Auth DoS caps:** password capped at 128 chars (prevents scrypt CPU-drain
  attacks), constant-time legacy login comparison.
- **Rate limiting** on login/register.
- **Row-Level Security** enabled (migration `0013`) + per-user Gemini model
  (`0014`).
- `SETUP_FRESH.sql` full-schema bootstrap script added.

---

## 3. Cron / scheduler fix

**`4ff8635` · Exempt /api/cron from auth middleware** *(6 Jul)*

The external scheduler (cron-job.org) was being blocked by the auth middleware.
Fixed so the scheduler can actually reach the reminders endpoint. (One-line
change in `proxy.ts`.)

---

## 4. Onboarding fixes & polish

**`88ab856` · Fix onboarding stuck on "Saving"** *(6 Jul)*
- **Bug:** after saving, the soft `router.replace()+refresh()` could stall
  mid-transition — button froze on "Saving…" and home never loaded (worst in the
  installed PWA).
- **Fix:** hard full-page navigation to home so it renders fresh.

**`645cc49` · Clarify onboarding, polish avatar, robust Gemini key check** *(6 Jul)*
- Plainer onboarding question wording + a **Sample answer** in every field.
- Profile avatar upgraded from flat blue to a polished treatment.
- Gemini API key now validated by *shape* (charset + length 35–100), accepting
  both legacy `AIza` and newer `AQ.` keys; added show/hide, paste-clean, and a
  live hint.

---

## 5. Branding & icon iterations

A run of visual-identity tweaks:
- **`a0ccf65`** — profile avatar made white, icon-only (dropped blue background).
- **`c7b66a0`** — app icon: solid brand-blue with the app mark (dropped the
  hardcoded "L").
- **`779fc3a`** — profile: removed `AIza`-prefix talk from the key field text
  and guide (since newer keys don't use it).

---

## 6. Push notification fixes

**`1c3806c` · Wait for active service worker before subscribing** *(6 Jul)*
- **Bug:** subscribing to push before the service worker was fully active could
  fail silently.
- **Fix:** wait for the active worker first.

**`0e506bf` · State-aware enable button, surfaced errors, test endpoint** *(7 Jul)*
- **Bug 1:** the "Enable notifications" button reappeared every visit even when
  already enabled. **Fix:** button now checks the device's real permission +
  subscription state on load, so once enabled it stays quiet ("Notifications
  enabled on this device").
- **Bug 2:** push failures were swallowed silently — a cron run reported success
  while sending nothing. **Fix:** errors are now logged and counts returned
  (`subs` / `sent` / `errors`).
- **New:** on-demand `type=test` cron endpoint that ignores all gates and pushes
  to every device now, reporting exactly how many went out — so delivery can be
  verified.

---

## 7. Journals expanded

**`7d5365c` · Afternoon reset journal + home polish** *(7 Jul)*
- **New:** afternoon journal wizard (midday pulse, actions, reset).
- Morning step 0 now fits mobile without scrolling.
- Home: bright emerald Untangle button; distinct trophy (best streak) and dashed
  (open loops) icons instead of duplicate sparkles.

**`f30d984` · 5 gratitudes, clearer copy, starters, Leo follow-up** *(7 Jul)*
- Morning/evening gratitude raised to 5 entries; all step copy + sample answers
  rephrased.
- **New:** tap-to-fill starter chips across morning / evening / afternoon.
- Morning: Leo follow-up thread under his plan; "before you go" redesigned.
- Manifestation: full-image vision board, blue vision-ritual backdrop.

---

## 8. Manifestation / vision board

Three refinement commits *(7 Jul)*:
- **`ae44e97`** — moved the Add-to-board composer above the board image.
- **`6b36135`** — premium framed board that hugs the image (no letterbox gaps),
  gradient mat frame, centered plaque title "The life I'm building".
- **`4cbb988`** — load-more caps + daily shuffle (shows 6, reveals all on Load
  more) and a full-screen zoom lightbox (Esc / tap to close).

---

## 9. Check-ins overhaul

**`89a4460` · Save + return home, status colors, full prompt** *(7 Jul)*
- **Bug:** good-mood check-in froze on the page. **Fix:** it now saves and
  returns home.
- Home tiles color by status: green = done, yellow = partial, red = not done.
- Prompt text wraps fully instead of truncating.

**`bb34537` · "Later" option + shared done-sync** *(7 Jul)*
- **New:** "Do it later" check-in response (+ migration `0016` constraint).
- Home check-in tiles: status colors (green/yellow/blue/red), full prompt.
- **Bug fix:** check-in submit hang on "good" mood → routes home + refreshes.
- Afternoon "Where they stand" now lists all priorities + schedule blocks.
- Schedule blocks: tap-to-strike done state + strike-through UI.
- **Sync:** done-state shared across home check-ins, schedule, and afternoon by
  matching text.

---

## 10. Afternoon status buttons — selectable + color-coded

Two follow-up commits *(7 Jul)* on the midday-reset "Where they stand" step:

**`6c23f90` · Make "Not yet" visibly selectable**
- **Bug:** tapping **Not yet** did nothing visible. It was never disabled —
  `setStatus` always fired — but its selected style was almost identical to the
  unselected one, and "Not yet" is the *default* status, so selecting it looked
  like a no-op.
- **Fix:** gave selected "Not yet" a distinct highlight so the tap registers.
- Also committed `EVOLUTION.md` (this file) for the first time.

**`4264bb5` · Uniform buttons, colored circles**
- All four status buttons now share the **same** shape/style — only the circle
  color changes when selected:
  - **Done** → green · **Moving** → blue · **Stalled** → yellow · **Not yet** → red
- Dropped the odd ring treatment "Not yet" had; it's now consistent with the rest.

---

## 11. Leo follow-up on every journal

**`8b6ea42` · Ask-Leo follow-up after afternoon + evening** *(7 Jul)*
- Morning already let you keep questioning Leo under his plan read. Extended the
  same reusable `LeoFollowup` thread to the other two journals:
  - **Afternoon** — drops under the midday recalibration nudge.
  - **Evening** — drops under tonight's realization dose.
- Up to 10 rounds, seeded with that section's Leo read so he stays grounded;
  chat lives in the UI, nothing persisted.

---

## 12. Journal never lost + history viewer

**`fc79ae7` · Resilient journal submit + read-back history** *(8 Jul)*

**The bug (why last night's evening journal wouldn't submit):** every journal
submit was *AI-first* — it called Leo (Gemini) **before** writing anything to the
database, with no error handling. If Gemini failed (rate limit, network blip, key
issue), the whole action threw: **nothing was saved** and the button hung on
"Reflecting…" forever. The user's writing was lost.

- **Fix (all three journals):** Leo's generation is now wrapped so a failure can't
  block the save — the entry is written to the DB regardless, with a plain
  fallback read if Leo is down. The wizards also recover: on any error the button
  resets to **"Try again"** with a *"your writing is still here"* note instead of
  freezing. Applies to morning (critique + story), afternoon (nudge), evening
  (realization + manifestation).

**New — Journal history viewer** (`/journal`, in the sidebar/Journal group):
- One page listing every day you've journaled or planned, newest first.
- Tap a day to expand and read the full **morning** (priorities, to-dos, schedule,
  affirmation, mood/energy, gratitudes + Leo's plan read & story), **afternoon**
  (on-track, priority statuses, drift, honest line, refocus + Leo's nudge), and
  **evening** (moment, win, lesson, scorecard, honest truth, energy leak,
  self-respect, tomorrow's first move, gratitudes + Leo's realization &
  manifestation).
- Read-only, merges the `journal_entries` row with that day's `plans` row.

---

## 13. Leo stopped going silent on transient Gemini blips

**`PENDING` · Retry Gemini + guard empty reads** *(8 Jul)*

**The bug (why Leo didn't respond to a morning entry):** Google's free-tier
`gemini-2.5-flash` was intermittently returning **`503 UNAVAILABLE` — "model
experiencing high demand"** (measured live: ~50% of calls failing in a spike). It
was **not** a rate limit (429) and **not** a bad key — the key is valid and works
whenever it gets a 200. But the AI client had **no retry**: a single 503 dropped
straight to Leo's fallback text. Morning fires *two* Leo calls (plan critique +
story), so the odds of at least one showing the fallback were high — that's the
"Leo not responding" symptom.

- **Fix 1 — retry with backoff:** `generateText` now retries the retryable
  statuses (429/500/502/503/504) up to 4 times with exponential backoff + jitter
  (~0.4s → 0.8s → 1.6s). Real errors (400 bad request, 403 bad key) still fail
  fast. Applies to both Gemini and OpenAI paths.
- **Fix 2 — empty-response guard:** a `200` with no text (safety block, or a
  thinking model that spends its whole token budget) used to save a *blank* read.
  It now throws so the caller's fallback text shows instead of Leo going silent.

**Also — the "Couldn't lock in" failure was a *separate* problem:** the three
journal saves never checked Supabase's returned `{ error }`, and had no retry. So
(a) a transient network drop reaching the database lost the whole save (the
morning "Try again" screen), and (b) a real DB error would have silently
"succeeded" while saving nothing. New `writeWithRetry` helper wraps the primary
saves (plan lock, morning/afternoon/evening journal upserts): it retries transient
failures with backoff **and** throws on a persistent error, so the UI honestly
shows "Try again" instead of faking a save. Confirmed via the DB: the failed
lock-in had written no row at all.

## Bug fixes at a glance

| Bug | Fixed in |
| --- | --- |
| Schedule showed same data on every day | `db006fb` |
| Cross-user data access (IDOR) on habits | `b020a6f` |
| Cron blocked by auth middleware | `4ff8635` |
| Onboarding stuck on "Saving…" | `88ab856` |
| Push subscribe failing before SW active | `1c3806c` |
| Good-mood check-in froze the page | `89a4460` |
| Check-in submit hang on "good" mood | `bb34537` |
| "Enable notifications" button re-nagging | `0e506bf` |
| Push failures silently swallowed | `0e506bf` |
| Afternoon "Not yet" looked unselectable | `6c23f90` |
| Journal submit lost the entry + hung when Leo/Gemini failed | `fc79ae7` |
| Leo went silent on transient Gemini 503s (no retry) + blank on empty reads | `PENDING` |
| Lock-in save lost on a network blip + swallowed DB errors (no `.error` check/retry) | `PENDING` |

## Database migration trail

`0001` goals/planning/manifestation · `0002` goal parent link · `0003` weekly
day actions · `0004` manifest ritual + habit stack · `0005` vision-board goal
images · `0006` habit minutes · `0007` habit icons · `0008` **multi-user** ·
`0009` user email · `0010` profile extras · `0011` habit colors · `0012` user
email unique · `0013` **enable RLS** · `0014` per-user Gemini model · `0016`
check-in "later" constraint.

---

## Where it stands now (latest)

Newest change (uncommitted): Leo now retries transient Gemini `503 "high demand"`
blips (with backoff) instead of going silent on the first failure, and treats an
empty AI response as a failure so a blank read never gets saved. Previous commit:
**`fc79ae7`** — journal submits save even when Leo fails + the `/journal` history
page.

**Working:** full daily loop (morning → midday reset → evening), habits, goals,
schedule, check-ins with cross-view done-sync, manifestation board, analytics,
Leo AI coach, multi-user accounts with RLS + security hardening, and push
reminders you can test on demand.

**Known open items (not built yet):**
- Roadmap asks still pending: goals/planning depth, evening scorecard,
  manifestation extras, stories.

---

*Generated from git history + migration trail on 7 Jul 2026.*
