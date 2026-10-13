# Anime-pink presentation

The supplied four-phone mockup replaces the previous folklore presentation reference. This change rebuilds its layout with interactive React Native components. It introduces no business feature, remote service, migration, or analytics calculation.

## Theme and typography

`packages/ui/src/tokens.ts` owns the active `animePink` palette: charcoal heroes/workouts, white and very pale pink bodies, hot pink accents and soft magenta gradients. Existing semantic tokens continue to work. Primary actions use a slightly deeper pink (`#D92D73`) so normal white captions meet WCAG AA (4.59:1). Body secondary text and secondary action text also exceed 4.5:1. These constraints are covered by local tests.

UI, forms, cards, controls and metrics use the existing Inter fonts. Cormorant Garamond is limited to hero titles. Existing original font files are reused. No new font dependency was installed.

## Screens and shared components

- Home: scroll-owned, full-width hero; device-local greeting and actual account name where available; discreet JIMO branding; compact weekly calendar with actual dates, today, schedule and completion indicators; “Piano di oggi”, “Vedi tutto”, actual start/resume/empty state and the existing upcoming exercise. No invented workouts or durations.
- Scheda: SCHEDA / I TUOI PROGRAMMI in the upper hero; actual primary program summary and optional description; existing week selection, day state, overview and archived/other programs in light cards. New program and edit actions retain their existing destinations.
- Program / Day: compact scrolling gradient hero, light metadata forms, day/exercise cards and existing actions. Scheda → Program → Day remains the only hierarchy. The existing single native modal and action stack remain responsible for add-day, exercise library, prescription and custom exercise; no mandatory extra route was added.
- Progress: upper hero title; four interactive tabs at the seam; filled pink period selector; white actual metric cards, larger Inter values and pink SVG charts. Short metrics use a side-by-side chart layout; long values stack to avoid squeezing a unit or value at 320 px. Nulls remain “—”; unsupported global volume remains unavailable. No mockup volume or percentage was introduced.
- Profile: upper title and the existing functional settings shortcut; a white identity card overlaps hero/body and displays the actual avatar, name and available email. No XP, level or achievements. Existing account, language, units, privacy, about and logout sections remain. Avatar camera/gallery/removal, URI persistence and account isolation use the unchanged hooks and storage.
- Navigation: one light, compact four-tab bar (Home / Scheda / Progressi / Profilo), line icons, readable labels, pink selected state, safe-area-aware height and at least 48 px targets. Workout remains reachable through existing entry points and retains its hidden tab route.
- Workout hub: the same scrolling hero/light-body structure. Active Standard, Rest, EMOM and Pyramid remain immersive charcoal with pink controls, lines and dynamic circles. Brush and enso rasters are not rendered. The animated progress ring, reduced-motion fallback, keyboard viewport and existing correction row alignment are retained.
- Shared buttons/cards/inputs: primary actions 54 px with white captions; white/pink secondary actions; 20 px white cards with a very soft shadow; white/pale pink fields with rounded corners and pink focus. Existing validation, numeric stepping and keyboard behavior remain.

## Artwork slots and originals

`apps/mobile/src/themes/anime-pink/assets.ts` is the central registry. All eight slots are intentionally `null` because the mockup did not include separate anime hero originals. The directory structure is ready at `apps/mobile/assets/themes/anime-pink/`:

- `home/hero.png`
- `program/hero.png`
- `progress/hero.png`
- `profile/hero.png`
- `workout/hero.png`, `standard.png`, `emom.png`, `pyramid.png`
- `exercises/` for optional future originals

`ThemeArtwork` and `HomeHeroArtwork` accept real React Native image sources. Their fallback is an SVG gradient constructed in code. Hero/immersive slots use `cover`; exercise characters use `contain` in a 4:3 thumbnail. Do not require nonexistent files: register supplied PNG/JPG originals with literal Metro `require` paths as described in the asset-directory README.

Existing exercise characters are unchanged. The light exercise background is reused with a pale pink `tintColor` at render time, so the original file remains untouched while its parchment colors do not appear. Characters are separate images and are never tinted. No dark exercise background appears in a light main body. Previous folklore, kitsune, oni, paper, brush and enso originals stay in the repository for rollback, but are not used as active hero/page graphics. No mockup screenshot or extracted character is included.

The difference from the mockup is deliberate and visible: anime characters await separate originals; all heroes currently show gradients. Data and actions also reflect JIMO's real capabilities, not the illustrative numbers or fictional features in the reference.

## Scrolling, status bar and responsive behavior

Main heroes are real children of their ScrollView, not fixed layers. Shared hero height is approximately 46% of the viewport, including the top safe area; longer text can expand it. Program/Day heroes are compact. Body content has navigator tab height plus 24 px bottom padding. Week selection preserves the existing smooth reveal and adjacent context.

Status icons are light over dark heroes and dark when the light body scrolls under the safe inset. Program headers track their own measured compact height. Native presentation configuration uses a light body/system navigation bar, transparent status backdrop and a charcoal splash; no permission or service configuration changed.

Browser checks use 320×740, 390×780, 393×851 and 430×860 with simulated safe insets. They cover actual scrolling, calendar width, tabs, overlays, long identity text, moderate text scaling, keyboard viewport behavior and the four workout states. A browser check does not replace a native phone/Expo Go check; camera permissions, OS keyboard and the final crop of future anime originals still need a device check when those originals are supplied.

## Preserved logic and verification

An initial SHA-256 inventory covers 179 protected files: API source, database schema/migrations, shared schemas/types, mobile auth/storage/SQLite/progress modules, workout and calendar helpers, avatar persistence helpers, and original assets. The final inventory must match byte-for-byte. Presentation files containing handlers were changed only around their render/styles; regressions exercise their existing actions.

The local tests include Standard target/actual separation, rest timing, durable EMOM preparation and automatic rounds, Pyramid snapshots, offline/outbox semantics, program deletion and analytics. Browser fixtures validate flows without Clerk, Neon or OpenAI connections. Test authentication is limited by existing code to localhost:4173; the final normal build sets it to false.

Required checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`, plus browser regressions and the credential scan. Exact results are recorded in the completion report. No database connection or migration is needed for this presentation task. Production is untouched.

## Completion results

- Lint: PASS, no warnings.
- Typecheck: PASS across all 10 tasks.
- Local tests: PASS, 181 tests (141 mobile, 21 API, 14 shared schemas, 5 database/configuration). Backend and database tests use local fixtures; no Neon connection.
- Browser regressions: 67 PASS, followed by 19 PASS for the changed navigation/status layout and four additional text-scaling scenarios. There are 71 distinct browser cases in total.
- Responsive: all four requested viewports pass, including 1.3× text, full visibility of all four Progress pills at 320 px, and navbar targets ≥48 px both with and without a bottom safe inset.
- Format check: PASS.
- Protected inventory: all 179 files byte-identical; no original asset modified.
- Screenshot examples are saved outside the repository at `/workspace/artifacts/jimo-anime-pink-preview/`.

Build: PASS, all 6 tasks; Expo exported Android, iOS and web. The normal web artifact has test authentication set to false. Credential scan: PASS across 690 source/artifact files, with no credential contents printed. No native APK/IPA was produced. Physical Expo Go verification remains a device check, especially for camera/gallery permissions and the OS keyboard.
