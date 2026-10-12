# Android warnings and Scheda presentation refinement

This pass addresses the Android device report without changing Home, Workout, Progress/Profile, Auth, API, database, sync, AI or approved background assets. No migration, Neon operation or production operation is required.

## Native SVG cause and fix

The installed `react-native-svg` native `extractGradient` clones every immediate child with a `parent` prop and reads each immediate child's stop attributes. The conditional Fragments in `ProgramScreen` therefore received an invalid React prop, and their nested Stops were interpreted as a single default stop rather than the intended gradient. Browser SVG rendering does not use this native parser, so web-only validation could miss both problems.

`ProgramBackgroundWash` now gives `LinearGradient` a flat array of real `Stop` elements with stable keys and numeric offsets. Palette, opacity values and geometry are preserved. No Fragment or wrapper component is a child of the gradient. Other existing gradient/wash children were inspected and already use direct Stops. No LogBox ignore, warning filter or vendor patch is introduced.

The native regression test bundles the installed parser itself through a test-only resolver, reproduces the old Fragment's injected `parent` and lost stop, then checks all native ink/parchment stops after the correction.

## Native date picker

The installed DateTimePicker 9.1.0 API supports `onValueChange` and `onDismiss`. Android's imperative `open` uses these callbacks; dismiss is a no-op for the saved field value. iOS's inline picker updates its draft with `onValueChange`, and dismissal closes the dialog without committing it. Existing Confirm/Cancel UI and localized display remain unchanged. Calendar dates still use local year/month/day rather than a UTC conversion.

The actual Android `DateField` is exercised with an isolated native dialog fixture: selection, cancellation, keyboard dismissal, unchanged prior values and local calendar dates across Europe/Rome, America/Los_Angeles and Pacific/Kiritimati, including the autumn DST date.

## Scheda presentation

- Week chips: 44px minimum touch height, rounded editorial pills, balanced horizontal padding, light sage selection, translucent dark ink and a thin border. The existing horizontal scrolling, selected-week reveal, adjacent context and reduced-motion behavior are unchanged.
- Day cards: 28px corners, a single thin border, retained artwork, local ink gradient/wash, more vertical breathing room and a smaller decorative circular arrow. Current day remains visibly emphasized. Existing start/resume/completed/draft navigation and workout calls are unchanged.
- Week overview: equivalent editorial rows for each real day, discreet state indicators, serif names, Inter counts and thin dividers. No enclosing opaque panel; a single day stays compact.
- Other programs: real status/count metadata and serif names in divider-separated rows with a discreet chevron. No heavy outer panel or individual cards.
- New program: an existing secondary text action with a 48px touch target and a transparent surface.
- Header: existing Scheda/program text and artwork, protected by the existing local dark readability wash. Cormorant Garamond, Inter, palette, navbar and safe-area strategy remain unchanged. Expo Go's developer controls are untouched.

## Verification scope

Browser contract fixtures cover the four requested viewports (320×740, 390×780, 393×851, 430×860), changing/revealing week 4, horizontal scrolling, adjacent selection context, program/day navigation, the pencil's manager route, secondary creation, dates, contextual Back, draft/active/archive states and reachable bottom content. Main visual tests collect console warnings/errors as well as page errors. Earlier business assertions remain intact.

Native dialog/SVG tests use the real JS components/parser with native boundaries replaced by fixtures. Existing Android Back unit tests run alongside browser navigation checks. No physical Android/iOS device or emulator is attached, so this does not claim a new real-device session.

Phone follow-up: open Home, Scheda, Crea programma and Progressi and check no `parent`/picker warning; select week 4 and return; open/close the picker with Cancel and Android Back (unchanged value), then confirm a date; use the pencil and return; scroll to the last other program/new-program action above the navbar. Use development settings only. No migrations or seeds.

## Results

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`: passed.
- Unit tests: 159 passed, including four new native SVG/date-picker regressions and the existing Android hardware Back tests.
- Browser tests: 41 passed. Main visual tests at all four requested sizes reported no console warnings/errors or page errors. Screenshots were inspected for the softened cards/pills, editorial overview, other-program rows and available bottom content.
- Export: Android, iOS and web passed with the auth test simulator disabled in the final artifacts. Browser testing used a separate clean export with the simulator enabled; Metro cache was cleared when switching configurations. No Auth application code changed.
- Credential scan passed. Background assets match the worktree at task start. All 403 existing files outside the seven targeted source/test edits are unchanged, including protected application/backend/schema files.
- No migrations, seeds, Neon connection or production operation. Physical-device confirmation remains the follow-up above.
