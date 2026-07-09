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

**Uncommitted · VAPID key crash + rotation** *(9 Jul)*
- **Bug:** `/api/cron/reminders?type=afternoon` 500'd for every user once the
  first real push subscription hit it. Vercel logs pinned it exactly: `Error:
  Vapid public key should be 65 bytes long when decoded`, thrown inside
  `webpush.setVapidDetails()` in [`lib/push-server.ts`](lib/push-server.ts).
  That call sat outside any try/catch, so one bad key crashed the whole cron
  route instead of just failing that user's push.
- **Why it looked like a regression:** the entire push stack
  (`lib/push-server.ts`, the subscribe route, `push_subscriptions` schema) was
  introduced fresh in the `db006fb` multi-user rewrite (6 Jul). The corrupted
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` had been sitting broken in Vercel since that
  day — it just never got exercised because subscriptions reset with the
  rewrite and nobody had re-enabled push on the new app until now.
- **Fix:** `ensureConfigured()` now catches the `setVapidDetails` throw and
  returns it as a per-call error result (`errors: ["vapid config: …"]`)
  instead of letting it escape — a bad key fails gracefully, cron keeps
  running for every other user. Regenerated a fresh matched VAPID key pair and
  replaced `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` in Vercel
  (Production + Preview). Both of you will need to hit "Enable notifications"
  again after this deploy — old subscriptions were signed against the dead key.
- **Follow-up:** rotating the key left every existing subscription 403'ing
  forever (a subscription is bound to the key it was created with — you can't
  resubscribe over it, the browser throws "different applicationServerKey
  already exists"). Two more fixes: (1) `send()` now treats 403 the same as
  404/410 and deletes the dead row instead of retrying it forever; (2)
  [`lib/push-client.ts`](lib/push-client.ts) now unsubscribes any existing
  subscription before subscribing fresh, and
  [`components/enable-push-button.tsx`](components/enable-push-button.tsx)
  keeps a "Tap to re-sync" button visible even when already "enabled" — so a
  future key rotation is a button tap, not a browser-settings hunt.
- **Follow-up 2, `f510e33`:** still no notifications after the above. Two more
  bugs found: (1) the "enabled" state showed a text line *and* a button,
  which read as two separate controls — collapsed to one button whose label
  changes with state. (2) The real bug:
  [`enablePushNotifications()`](lib/push-client.ts) posted the subscription
  to `/api/push/subscribe` but never checked the response. Browser-level
  subscribe can succeed while the server-side save 401s or throws — so the
  button said "enabled" with zero errors shown, but no row ever landed in
  `push_subscriptions`, so nothing could ever be sent. Now a failed save
  throws and shows as a visible error under the button.

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

**`33014bc` · Retry Gemini + guard empty reads** *(8 Jul)*

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

**Follow-up — lock-in *still* failing after the retry fix (`PENDING`):** re-tested
the exact `plans` + `journal_entries` upserts against the live database with the
current `.env.local` service-role key — **both succeeded**. So the DB, the schema
(the `(user_id, date)` unique indexes from migration 0008 are present), and the
credentials are all fine locally. The persistent failure is **environment**, not
code: either the deployed (Vercel) `SUPABASE_SERVICE_ROLE_KEY` doesn't match the
key that works locally (Supabase's new `sb_secret_…` keys replaced the legacy
`eyJ…` JWT keys — rotating locally without updating Vercel breaks prod writes), or
a local `next dev` was still holding a stale env after `.env.local` changed (only a
full dev-server restart reloads it). The lock-in screen now **prints the real error
text** under the generic message (`e.message`, e.g. `lock plan failed after 3
attempts: …`) so the true reason is visible instead of hidden behind "check your
connection".

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
| Leo went silent on transient Gemini 503s (no retry) + blank on empty reads | `33014bc` |
| Lock-in save lost on a network blip + swallowed DB errors (no `.error` check/retry) | `33014bc` |
| Lock-in still failing = env, not code (prod service-role key mismatch); now shows real error | `PENDING` |

## Database migration trail

`0001` goals/planning/manifestation · `0002` goal parent link · `0003` weekly
day actions · `0004` manifest ritual + habit stack · `0005` vision-board goal
images · `0006` habit minutes · `0007` habit icons · `0008` **multi-user** ·
`0009` user email · `0010` profile extras · `0011` habit colors · `0012` user
email unique · `0013` **enable RLS** · `0014` per-user Gemini model · `0016`
check-in "later" constraint.

---

## Deep dive — "Couldn't lock in" + empty Leo read *(8 Jul)*

Root cause found by direct diagnostic (live Gemini call + live DB write, no
guessing): **`GEMINI_API_KEY` in `.env.local` was empty** (length 0). Every Leo
call hit Gemini `403 PERMISSION_DENIED` ("use API Key"), so the morning "Leo's
read on today's plan" came back blank. The DB write path itself was proven
healthy (a real `plans` upsert succeeded in the test), and the service-role key
is valid (prod pages render past `getUserId`), so earlier "Vercel key mismatch"
and "DB failure" theories were both wrong. Git tree was clean — no tampering, no
stray edits to `.env.local`.

Secondary reliability fix: `GEMINI_MODEL` was `gemini-2.5-pro`, a *thinking*
model that can burn its whole output budget on reasoning and return a 200 with
no text (→ treated as failure). Switched default to **`gemini-2.5-flash`**.

Fix = repopulate `GEMINI_API_KEY` locally and on Vercel; model set to flash.

## Deep dive — the REAL submit blocker: `CoachChatMsg is not defined` *(9 Jul)*

The "can't submit morning/afternoon/evening" bug (for every user, not just the
owner) was **not** the Gemini key and **not** the DB. Vercel runtime logs showed
the truth: `POST /morning` returned **500** with
`ReferenceError: CoachChatMsg is not defined` at module evaluation.

Root cause: [`lib/actions/coach.ts`](lib/actions/coach.ts) is a `"use server"`
file, and a `"use server"` module may export **only async functions**. It had
`export type { CoachChatMsg };` — a re-export of an imported type. Turbopack's
server-action transform enumerates every export to build action proxies and
emitted a *runtime* reference to `CoachChatMsg`, which is a type (erased at
compile) → `ReferenceError` the moment the module is evaluated. Since the
morning/afternoon/evening pages import `LeoFollowup` → `@/lib/actions/coach`,
that broken module 500'd the whole route, so the form could never submit and Leo
could never be reached. (Local `export type Foo = {…}` *declarations* in the
other action files are fine — only the imported-type **re-export** breaks.)

Fix:
- Removed `export type { CoachChatMsg }` from the `"use server"` file.
- [`components/leo-followup.tsx`](components/leo-followup.tsx) now imports the
  type straight from `@/lib/ai/coach` via `import type` (fully erased, pulls no
  server-only runtime into the client bundle).
- Verified: `tsc --noEmit` clean and `next build` compiles all routes
  (`/morning`, `/afternoon`, `/evening`) with no ReferenceError.

Note: the 8 Jul "empty Leo read" (Gemini key) was a *separate, real* issue but
was never the submit blocker — this was. Keys/models are per-user by design
(`app_users.gemini_api_key` + `gemini_model`, set on /profile).

## 14. Habit edit & delete

**`3da8502`** *(9 Jul)*
- **Bug:** the habits page had no way to rename a habit, move it between
  morning/afternoon/evening/anytime stacks, or remove one — `addHabit` existed
  but there was no `updateHabit`/delete action at all, and `HabitRow` had no
  edit affordance.
- **Fix:** added `updateHabit()` and `archiveHabit()` to
  [`lib/actions/habits.ts`](lib/actions/habits.ts). Delete is a soft
  archive (`status = 'archived'`), not a hard row delete — `habit_logs` rows
  reference the habit by id with no cascade, and `getHabitDashboard()` already
  filters out archived habits, so archiving just makes it disappear cleanly
  without touching streak history. [`HabitRow`](app/habits/habit-tracker.tsx)
  now has a pencil button that opens an inline edit panel (name, anchor,
  time-of-day pills, delete-with-confirm).

## 15. Habit stack colors, journal headings, leaner schedule step

**Uncommitted** *(9 Jul)*
- **Ask:** habit stack colors didn't match the home page's
  morning/afternoon/evening journal colors; "anytime" had no distinct color;
  the three journal wizards gave no clue which journal you were in beyond the
  step title; the morning journal's schedule step (a full `TimeWheel` +
  input + priority pills + remove button per block) read as bulky.
- **Fix:** [`habit-tracker.tsx`](app/habits/habit-tracker.tsx)'s `STACKS` now
  uses `solid-coral`/`solid-bronze` (same classes the home page uses for the
  morning/afternoon journal links), a new `solid-evening` (matches home's
  evening card navy) and a new `solid-seafoam` (greenish-blue) for anytime —
  both added to [`globals.css`](app/globals.css). Each journal wizard
  ([`morning-wizard.tsx`](app/morning/morning-wizard.tsx),
  [`afternoon-wizard.tsx`](app/afternoon/afternoon-wizard.tsx),
  [`evening-wizard.tsx`](app/evening/evening-wizard.tsx)) now shows a colored
  "Morning/Afternoon/Evening Journal" label above the step counter. The
  morning wizard's schedule step now collapses each block's `TimeWheel`
  behind a tap-to-open time chip instead of always rendering it, and swaps
  the full-width "Remove" button for a small trash icon — same data, far
  less vertical space per block.

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
