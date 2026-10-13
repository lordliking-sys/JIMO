> Historical implementation report. The current Program/Giornata overlays and definitive hands-free EMOM behavior are documented in [program-flow-handsfree-emom.md](program-flow-handsfree-emom.md).

# Android refinement and real workout modes

Scope: the requested Android UI fixes plus real EMOM and Pyramid prescriptions. Home, folklore PNGs, authentication and AI implementation are unchanged. All live database operations in this task use Neon HTTP and the verified development branch `br-purple-math-b1fsq2wb`. No production connection or deployment was made.

## UI changes

1. **Hero/status area:** the shared `SectionHeroCanvas` supplies artwork to `SectionHeroFrame`. The artwork is now a child of the frame in the scrolling content, including its top safe-area inset. Program management previously mounted its illustration outside a top-inset `Screen`, leaving the safe-area strip behind during scrolling. Opt-in `Screen.edgeToEdge` removes that stationary top inset; the frame and image now move together. Progress, Profile, Scheda and the Workout hub use the same frame model. `useSectionStatusBar` switches Profile icons from light over the dark hero to dark over the paper body at the status-area midpoint; dark/ink pages retain light icons and Progress retains dark icons. Status components are mounted only for focused pages. No fixed illustration or page-specific patch remains in these surfaces. Home's existing approved scroll implementation is untouched.
2. **Exercise cards:** the original card PNG covers the rounded exercise row and is clipped by its radius; the transparent character remains a separate `contain` image. Shared thumbnail geometry uses the original dimensions/alpha bounds, consistent inset margins and a wider frame for horizontal poses. Separate light/dark standalone compositions remain supported. Original files are byte-identical; no image generation or raster edits.
3. **Program structure:** day headers display program name plus assigned weekday, or the real day name when unscheduled. Structure rows use the same useful labels; IDs, ordering and navigation remain unchanged.
4. **Duration:** a blank duration has no empty numeric container or reserved value column. Selecting a week preset reveals the ordinary control, including arbitrary numeric editing. The form still saves unspecified duration as null.
5. **Profile:** the avatar is followed only by the account name. The motto is not replaced with another slogan.
6. **Progress:** `PROGRESSI` / `PROGRESS` sits centered at the bottom of the existing hero, near the seam. Hero height is unchanged; Scheda, Profile and Progress retain shared geometry.
7. **Workout hub:** an illustration occupies the upper hero; the schedule, Resume and existing read-only visual examples are in a uniform dark/ink body. Approved Standard and Rest artwork/layout remain intact.
8. **Scheda day cards:** landscape images and their gradient layers are removed. Ink surface, sage border, cream text, sage arrows, rounded corners, states and navigation are preserved.

## Domain and persistence

`program_exercises.workout_mode` is a bounded varchar with an application union (`standard`, `pyramid`, `emom`) and a SQL CHECK. It does not alter any existing stable enum. Missing mode in older cached DTOs means Standard.

- **EMOM:** `target_sets` represents rounds; fixed `target_reps` is the per-round target. `emom_interval_seconds` defaults to 60 in the application and snapshots. The domain accepts 5–3600 seconds for extensibility; the initial builder displays the configured interval and adds no interval picker. EMOM is restricted to repetition-tracked exercises.
- **Pyramid:** `set_targets` is a typed, Zod-validated JSONB array, ordered by set index. Each entry stores its own reps or duration, load/assistance, optional RPE and optional rest. It is not an arbitrary string or configuration hidden in notes. Count must equal `target_sets`; load/tracking validation applies to each entry. Compact selectable rows allow add, remove, edit and reorder, up to the existing 100-set limit.
- **Workout snapshot:** `workout_mode_snapshot`, interval snapshot and `emom_started_at` belong to the existing workout exercise. Per-set values become the existing independent `workout_sets.target_*` columns; `target_rest_seconds` extends those targets. No live join recalculates targets from a changed program.

Online Start snapshots everything in the existing Neon HTTP transaction/CTE. Offline Start snapshots the cached program in the existing SQLite transaction. History and Progress continue to read actual sets through the existing queries; no new metric or AI path is introduced.

## EMOM execution and TARGET versus ACTUAL

`START_EMOM` records the start timestamp and its outbox operation in one SQLite transaction. Repeated Start returns the original timestamp without queuing another operation. The server applies the operation under the same receipt/sequence/advisory-lock mechanism as all other workout operations.

The clock derives current round and remaining seconds from `(now - persisted start) / interval`, using the existing foreground-aware `useClock`. Its one-second tick requests a redraw; it does not decrement persisted state. Reopening or resuming immediately catches up to real elapsed time. Rounds advance automatically at interval boundaries, even if the user has not confirmed a previous result. Elapsed rounds remain available for explicit recording; future rounds cannot be recorded yet. Timer expiry never invents actual reps or silently completes a set.

Actual draft prefills from the selected round's target, then uses `COMPLETE_SET`. A target of 5 and actual of 4 are stored separately. Completed rounds open the existing correction overlay. Last-five-second visual/accessibility feedback and the existing guarded Expo haptics are used; no audio dependency, audio asset or forced sound is added. Unsupported haptics cannot crash the session; reduced motion suppresses haptic feedback.

Pyramid uses the existing set editor, completion, correction and real timestamp-based rest flow. Its live timeline highlights the current set, checks completed sets and shows neutral future targets. Correction writes only actuals and preserves the original completion timestamp. Null per-set rest means no rest; old Standard snapshots with a missing/null new column inherit their original exercise-level rest.

## Migration and development evidence

One new version, `0008_workout_modes.sql`, adds seven columns and mode/interval/per-set/rest constraints, and broadens the sync operation CHECK to include `START_EMOM`. It adds no table, removes no data and changes none of the six stable enums. Eight prior migration files and ledger entries remain unchanged.

The first development application was followed by a real integration test that caught the pre-existing sync CHECK rejecting the new operation. The **new, unpublished 0008 draft only** was corrected before publication. Development was aligned atomically under the migration lock after checking its exact original draft hash; only that draft's CHECK and ledger hash changed. No historical migration was rewritten. `drizzle-kit generate` subsequently reported no schema changes, and the read-only live schema/ledger check passed with nine versions total. No second new migration version, `drizzle push`, seed or destructive data operation was used.

Before/after fingerprints of all legacy fields verified preservation of the 4 existing prescriptions, 6 workout exercise snapshots and 32 workout sets. Synthetic integration tests use isolated accounts and delete only their own data afterward.

SQLite's version 2 schema already stores validated exercise/set/program DTO payloads and uses an unconstrained textual outbox operation type. The additional typed fields fit those existing payloads; no SQLite table change or local migration is needed. Decimal target/actual columns remain canonical TEXT, and FIFO, retry, owner isolation, reconciliation, duplicate receipts and rollback keep the existing implementation.

## Verification

- Local unit tests: 176 passed, including real SQLite transactions, failed outbox rollback, kill/reopen for both modes, timestamp catch-up, actual/target separation, per-set rest, null rest, future-round rejection, network/401 pending operations, ordered retry and duplicate acknowledgement.
- Neon HTTP: the new mode integration passed; the 18 existing Standard/sync integration cases also passed, including concurrency, ownership, immutable snapshots and lost-response replay.
- Read-only `pnpm db:check`: schema, columns, constraints, stable enums, audit triggers and nine ledger versions matched.
- Browser regressions: 65 distinct selected cases passed across the full run and targeted reruns. Initial failures were obsolete UI expectations (generic day heading, day-card illustrations, old Home calendar/history paths) or test fixtures; their assertions were aligned with requested/current behavior. Standard, Rest and existing read-only visual examples remain covered.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (176), and `pnpm format:check`: passed. Credential scan: passed; values were never printed. `pnpm build`: passed (all six build targets; normal Expo Android/iOS/web export with auth-test disabled).
- A final targeted UI run passed all 20 cases, including the four viewport matrices, sage arrows and asymmetric lateral safe insets.

The viewport matrix is 320×740, 390×780, 393×851 and 430×860. Browser tests simulate top/bottom device insets, exercise real scroll geometry and SQLite web persistence, and take screenshots. They are not a physical Android run: OS status icons, lock screen and device haptics require the final Expo Go device check. Timestamp recovery is verified through pure-clock tests, reopened real SQLite files and browser reload.

## Expo Go check

Use the existing development API/mobile setup. In the manual prescription editor choose **Tipo serie → EMOM** or **Piramidale**, save and start the day through the usual Workout hub or Scheda. The separate **Anteprima** actions remain read-only examples; they do not create sessions.

For EMOM, start the interval, change a 5-rep target draft to 4 actual reps and confirm. Lock/background briefly, reopen and check elapsed round/countdown. Record a missed earlier round explicitly. For Pyramid, give different targets to consecutive sets, complete one with different actual reps, verify rest and correct through the existing overlay. Repeat offline, restart the app and reconnect; pending operations should sync without losing or duplicating the workout. Verify a completed session in History/Progress.

No commit, push or new ZIP is part of this implementation request.
