# Program flow and hands-free EMOM (Android refinement)

## Program navigation

Scheda is the only hub. Its program name and pencil open `/program/[id]`, the same metadata + days editor for active, draft and archived programs. Creation uses that same `ProgramForm` and replaces the creation URL with the persisted program ID. There is no creation-method page, Program Manager or separate structure/settings destination in the flow.

The only child destination is Giornata (`day-detail`). Its compact header aligns program name and weekday beside Back; its body shows the day's real name and exercise count. No generated “Giorno 1/2/3” heading is used, including the hub cards; assigned weekdays and actual day names replace numeric labels. Program metadata stays mounted when navigating to a day; day content stays mounted throughout exercise actions.

Actions use `ProgramOverlay`, one native Modal with an internal action stack:

- Day: add/edit name, weekday and notes, using the original Zod schema and program service.
- Exercise: library → configuration → same Giornata, including Standard, real Pyramid and EMOM.
- Existing exercise: same configuration editor + removal confirmation.
- Custom exercise: library → custom form → configuration, using the original exercise service.

The library retains search, paging and source/tracking filters; tracking uses visible choices and has no ellipsis menu. Character PNGs remain `contain`, row backgrounds `cover`, with the existing neutral fallback. No assets were generated or edited.

Native Modal `onRequestClose` closes only the current action on Android. An exercise editor opened from the library returns to the library; an existing prescription editor closes back to the day. Giornata Back targets Programma and Programma Back targets Scheda, including direct links. The existing keyboard-aware Screen and safe-area/footer insets are reused. On web, the background is inert and hidden from the accessibility tree while an action overlay is open; Modal's own Escape behavior handles the stack once.

Legacy manager/settings routes redirect to hub/editor; day, library, custom and prescription deep links resolve to the same destination/overlay components. No duplicate legacy forms remain.

## Visual changes

- Profile: removed the local dark readability wash behind the avatar. Original Kappa, avatar, border, camera and name remain; no motto.
- Progress: title moved upward by 12 px, without changing hero height, tabs or period selector.
- Duration: one wide inline stepper, no presets or reserved empty row. Existing values (including null) remain representable; validation remains 1–520 weeks when set. New programs start at 4 weeks.
- Existing scroll-owned heroes and opaque light/ink bodies remain in place; artwork leaves the status area with the content.
- Home, Kitsune, integrated JIMO lettering, crop, cards, weekly navigation, upcoming exercises and navbar are unchanged.

## Hands-free EMOM

`emomStartedAt` now stores the beginning of Round 1. Starting from the new mobile player persists this timestamp as tap time + 10 seconds, atomically with the existing START_EMOM outbox operation. Until then, PREPARATI displays 10…1 in the same player. Preparation is excluded from EMOM intervals and round count. A redraw up to one second late cannot display 11.

START_EMOM accepts optional `preparationSeconds: 10`. The server derives the same start timestamp from event time plus this validated offset using a SQL parameter. Legacy `{}` operations keep their original immediate-start semantics and receipt hashes. No database/SQLite migration or new engine is required.

`emomClock` derives preparation, current round, completed interval count, deadline and finish directly from the persisted start, interval and number of sets. `useClock` redraws on tick and AppState resume; it does not run a backlog of expired timeouts. Reanimated interpolates the ring to its real deadline between text ticks, with a static per-tick fallback for reduced motion. The grid is centered, wraps symmetrically (15 rounds = 5 × 3), and its indicators are information, not active-round editors.

The local repository reconciles elapsed intervals in one SQLite transaction. Only still-pending elapsed rounds receive actual defaults copied from their immutable set targets and existing COMPLETE_SET operations. Completion times are their interval-end timestamps. Duplicate reconciliation, SQLite reopen, background catch-up and sync retries do not duplicate writes. Existing actuals/skips are preserved; no automatic rest occurs for EMOM.

During execution there are no reps/RPE/load controls or round-confirm buttons. After the last interval, the player automatically shows a summary with a completion cue and correction buttons. The notice explicitly explains that actuals used target values as defaults. Corrections update only ACTUAL; TARGET stays immutable. A Continue action acknowledges the summary in owner-scoped local metadata and proceeds to the next exercise/session summary. It is not an interval confirmation. Workout-session finish retains its existing behavior. Summary acknowledgment failures remain visible and retryable.

Kill/restart during preparation, execution or summary is recovered from SQLite and metadata. OS background execution/haptics depend on Expo Go/Android lifecycle; elapsed intervals are reconciled on foreground/reopen. No new notification/background service was added. Existing Standard, Rest and real Pyramid keep their editors, per-set targets/rest and corrections.

## Permanent program deletion

Minimal new authenticated endpoint: `DELETE /programs/:id` → `{ id }`. The owner predicate and the existing program advisory lock enforce ownership; a different owner or missing program receives 404. PostgreSQL already cascades only source program/day/prescription structure and sets historical source references to null. Workout sessions, names, exercises, target snapshots and actual sets remain intact, including an in-progress session. No schema changes are needed.

The mobile action requires an explicit destructive confirmation explaining history preservation. It refreshes program queries, evicts only that owner's cached source program and returns to Scheda. Existing local sessions/history/outbox are never deleted. Before deletion, the mobile attempts sync and blocks if this device still has an unacknowledged START_WORKOUT for that program, avoiding removal of a source required by its pending initial snapshot. Program deletion requires an online API request, as do the existing program-edit operations.

## Verification

Verification passed: `pnpm lint`, `pnpm typecheck`, `pnpm test` (179 local tests), `pnpm format:check`; 67 distinct browser scenarios passed across the full run and the targeted rerun of the two updated layout tests (20/20 in the latter). Two real integration tests passed against the verified development branch, covering DELETE ownership/history and new/legacy EMOM sync plus Pyramid. `pnpm build` passed (API plus Android/iOS/web exports, auth test mode off); the final credential scan passed on source and generated bundles without printing any credential contents. Coverage includes the four requested viewports (320×740, 390×780, 393×851, 430×860), program/day/custom overlays, precise loads/RPE, date/duration editing, keyboard viewport changes, predictable Back/Escape, Standard/Rest/Pyramid, smooth EMOM ring, preparation/reload/automatic completion/correction and SQLite rollback/offline/restart/idempotency. The development integration tests use isolated synthetic users, verify the exact authorized Neon branch before writing and clean up their fixtures.

No physical Android device or emulator is attached to Codex. Browser responsive/Escape and SQLite lifecycle tests passed; final physical keyboard, hardware Back, status icon contrast, actual OS background/kill behavior and haptics should also be checked in Expo Go. This limitation is not represented as a device test.

No migration, seed, production deployment, OpenAI call or asset regeneration was performed. No credentials are printed or embedded in mobile/source. Authentication, AI code, analytics and historical migrations remain unchanged.
