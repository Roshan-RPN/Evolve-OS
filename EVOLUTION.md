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

## Database migration trail

`0001` goals/planning/manifestation · `0002` goal parent link · `0003` weekly
day actions · `0004` manifest ritual + habit stack · `0005` vision-board goal
images · `0006` habit minutes · `0007` habit icons · `0008` **multi-user** ·
`0009` user email · `0010` profile extras · `0011` habit colors · `0012` user
email unique · `0013` **enable RLS** · `0014` per-user Gemini model · `0016`
check-in "later" constraint.

---

## Where it stands now (latest)

Newest commit: **`0e506bf`** — push notifications made reliable and verifiable.

**Working:** full daily loop (morning → midday reset → evening), habits, goals,
schedule, check-ins with cross-view done-sync, manifestation board, analytics,
Leo AI coach, multi-user accounts with RLS + security hardening, and push
reminders you can test on demand.

**Known open items (not built yet):**
- **No journal-history viewer** — entries are saved but there's no screen to read
  past morning/afternoon/evening reflections back. (Analytics only counts days.)
- Roadmap asks still pending: goals/planning depth, evening scorecard,
  manifestation extras, stories.

---

*Generated from git history + migration trail on 7 Jul 2026.*
