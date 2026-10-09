# Program Management — pack v2

`JIMO_program_management_mockup_pack_v2.zip` replaces the earlier visual specification. The reference PNGs are comparison material only; none are bundled in the app. Every control, form, menu and row is React Native and uses existing application data.

## Reference mapping

| Reference                                  | Route / component                                                   |
| ------------------------------------------ | ------------------------------------------------------------------- |
| 01 Programmi                               | `/program/manage`, secondary program manager                        |
| 02 Crea programma                          | `/program/manual`, `ProgramForm`                                    |
| 03 Aggiungi giorni, 12 Struttura programma | `/program/[id]`, existing builder with compact day rows             |
| 04 Dettaglio giornata                      | `/program/[id]/day-detail`                                          |
| 05 Aggiungi esercizio, 07–09 Libreria      | `/program/[id]/choose-exercise`, one real searchable catalog        |
| 06 Modifica esercizio                      | `/program/[id]/exercise`, presentation-scoped `PrescriptionEditor`  |
| 10 Esercizio personalizzato                | `/program/[id]/custom-exercise`                                     |
| 11 Modifica programma                      | `/program/[id]/settings`, `ProgramForm` and existing archive action |

The approved Scheda tab retains its layout, week selector, artwork and states. Only the existing pencil action's destination/accessibility label changes to the secondary manager. The existing `/program/create` method-choice entry remains available in the new presentation, including its existing feature-gated import and pending review behavior. Creation from the manager goes directly to the manual form.

## Artwork, typography and readability

Five original assets are copied byte-for-byte into `apps/mobile/assets/jimo/program-management/`: `programs-hero-bg.png`, `day-detail-bg.png`, `exercise-library-bg.png`, `custom-exercise-bg.png`, `program-structure-bg.png`. `presentation.tsx` maps them to the appropriate screens and reuses the existing paper texture. Header artwork fades into parchment; structure artwork is deliberately faint. Exercise rows have no invented artwork, thumbnails or muscle labels.

The supplied day artwork is a warm landscape rather than the dark temple scene illustrated in reference 04. It is preserved as supplied, with an ink gradient across the header for readable parchment text and controls, fading into the paper content. No replacement artwork is generated.

Cormorant Garamond is loaded from the existing workout font; labels and controls use the existing Inter fonts. Colors reuse the existing parchment/charcoal/deep-green/sage tokens from Progress/Profile. Touch targets remain 48px. Safe-area, scroll and keyboard behavior reuse the existing `Screen` with optional presentation styles; defaults on other screens remain unchanged.

`HeroReadabilityWash` supplies local radial parchment/ink washes with transparent edges and numeric SVG stops. Home receives it behind the existing hero copy; Progress uses it behind its title. Layouts and approved background files remain unchanged. Progress content no longer repeats the selected tab's heading; Volume uses `Per esercizio` / `By exercise`. Edge-to-edge heroes, compact tab/period controls, avatar and auth refinements are preserved.

## Existing contracts and intentional differences

- Names, descriptions, optional duration/start dates, weekdays, day notes, reorder, activation, archive and prescriptions use existing APIs/schemas. No database, API, sync or workout engine changes. TARGET remains separate from ACTUAL.
- Numeric steppers preserve precise manual loads, half-point RPE, optional values, quick presets, fixed/range targets and duration-based exercises. Presets can scroll horizontally on small screens. Dates use the existing native picker and localized calendar labels.
- There is no usable program template library and no whole-program duplicate/delete operation. These controls are omitted. Existing archive preserves history; existing day/exercise deletion retains its confirmation and backend semantics. No unsupported operation is simulated.
- Exercise DTOs do not contain Push/Pull/Legs/Core taxonomy or muscles. Filters therefore use the real system/custom origin and reps/duration tracking. They filter the loaded catalog pages; the existing Load More action fetches additional pages. Search remains server-backed and debounced.
- The custom-exercise contract saves only name, tracking and default load mode. Muscle/category/custom notes/image upload fields are omitted because they cannot persist. Program/day/prescription notes remain supported.
- Reorder remains the existing contextual up/down actions, opened from the functional grip/menu controls. There is no new drag gesture, fake EMOM selector, pyramid engine or AI implementation.
- Day/structure mutations save immediately through the existing mutation adapter. The structure Save CTA exits the already-persisted structure. Secondary pages keep the existing stack navigation rather than recreating the mockup's illustrative four-tab navbar.

## Navigation and keyboard

Back uses the existing history when present and a contextual program route when opened directly, never an arbitrary Home destination. Prescription save dismisses to that day's detail. Android modal Back closes the native modal; inline numeric editors consume Back before screen navigation. Menu actions keep the existing post-dismiss sequencing for iOS. The program frame handles direct-entry hardware Back through the same contextual target.

Program settings opened directly fall back to that program's structure. The native date field and its iOS picker dialog adopt the program palette; the existing calendar parsing and picker callbacks are unchanged.

All forms use the existing keyboard avoidance/reveal strategy. Active inputs re-register after their inline editor/responsive layout commits so resize and keyboard changes reveal the correct field. A small keyboard icon is secondary to the persistent CTA. Day-name errors appear adjacent to the field.

## Validation scope

Browser tests use intercepted HTTP-contract fixtures with the actual Zod schemas and real components; no request reaches Neon. They preserve the existing business assertions and adapt only the newly separated navigation. Coverage includes program metadata/date validation, days/edit/reorder/delete confirmation, catalog search/filter, custom exercises, all supported load/tracking modes, RPE/rest, archive, direct/contextual Back and keyboard layout. Screenshots check 320×740, 390×780, 393×851 and 430×860. Existing Home/Progress/Profile/auth regressions check preservation of the earlier refinements.

Required repository checks are lint, typecheck, unit tests, Android/iOS/web export, format check and credential scan. Native picker/hardware Back and physical-device screenshots still require a phone; browser/export validation is not a substitute. No migrations, Neon connection or production operation is part of this pass.

Verified in this pass:

- `pnpm lint` and `pnpm typecheck`: passed.
- `pnpm test`: 155 passing tests (5 database schema/snapshot unit tests, 14 schemas, 21 API unit tests, 115 mobile).
- Browser regressions: all 40 passed across program management/builder/forms, Home/Scheda, Progress/Profile, Auth and password UX. Screenshots cover the four requested viewport sizes. The manager settings test preserves the program ID and remaining days after editing.
- `pnpm build`: passed, including Android, iOS and web exports with the auth simulator and AI import flag disabled.
- `pnpm format:check` and credential scan: passed. No secret content is included in the report.
- All five supplied PNGs match the copied assets byte-for-byte. No reference screenshots are bundled.
- A comparison with the worktree at task start confirms 153 protected source files unchanged, including API, database, shared schemas, auth, workout engine, sync/imports, native avatar, Profile and the main week selector. Earlier uncommitted refinements are retained.

Backend ownership integration tests are retained unchanged; they require Neon and were not executed under this task's no-Neon constraint. Existing route guards for missing days/prescriptions and backend ownership enforcement remain intact.
