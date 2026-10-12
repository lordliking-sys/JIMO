# Oni visual refinement

This pass follows `JIMO_visual_refinement_oni_pack.zip`. It extends the existing mobile presentation and preserves the previous Android/Scheda refinement. It introduces no backend, database, sync, AI or workout-engine changes.

## 1. Light and dark mapping

- Home and Progressi retain their light editorial surfaces.
- Profilo has a dark hero and a light body, with statistics in the body.
- Scheda and its program-management branches use charcoal surfaces, parchment text and sage accents: manager, creation, settings, structure, day editing/detail, library, custom exercise and prescription.
- Workout retains its immersive presentation. `StartWorkout` accepts an optional presentation button so the existing action in Scheda uses the sage program button; its mutation, conflict/resume behavior and other callers are unchanged.

## 2. Actual background assets

The four PNG files are copied unchanged to `apps/mobile/assets/jimo/folklore/` and referenced by `src/components/tab-artwork.ts`:

| Screen                      | Asset                    |
| --------------------------- | ------------------------ |
| Home                        | `home-kitsune-bg.png`    |
| Scheda and program branches | `scheda-oni-bg.png`      |
| Progressi                   | `progressi-tengu-bg.png` |
| Profilo                     | `profilo-kappa-bg.png`   |

All four source files are 941 × 1672. Byte equality with the supplied pack is checked. No asset is regenerated or used as a static UI screenshot. Titles, controls, cards and content remain real components. Existing workout/day artwork is retained.

## 3. Shared hero geometry

`MainTabHero` and `MainTabHeroProvider` give Progressi and Profilo the same responsive minimum height. Both use the same top inset and artwork geometry; the background extends behind the status bar and content stays below the inset. Actual content measurement is shared across the mounted tabs so larger text or a long profile name can expand both heroes together. Geometry resets for changes in viewport width/font scale.

The background keeps the source image proportions, crops within the shared hero and fades into the light body. Profile statistics remain below the hero. Browser checks compare both hero heights at every requested viewport and assert that profile statistics begin below the artwork.

## 4. Local readability washes

Home and Progressi use the existing soft parchment wash. Scheda titles and Profilo use a soft dark wash. The wash extends slightly to the left of the copy, has transparent edges and never intercepts touches. There are no opaque title panels, text outlines or heavy shadows. Program branch fields and footers use dark surfaces and readable parchment foregrounds.

## 5. Scheda refinement preserved

The existing rounded week pills, sage selected state, selected-week reveal with adjacent context, softened current-day cards, editorial week overview, divider-separated other programs and secondary new-program action are preserved. The Oni background and charcoal palette now continue through the program branches. Navigation, dates, numeric controls, program CRUD and start/resume actions retain their existing logic.

## 6. Progress headings

The existing removal of repeated tab headings is preserved. Volume content says “Per esercizio”; Panoramica, Forza and Frequenza do not add a duplicate heading above their content. Period selection and data behavior are unchanged.

## 7. Native Fragment warning

The installed native `react-native-svg` gradient parser clones each immediate gradient child with `parent` and reads its stop attributes. A conditional Fragment therefore receives an invalid prop and hides its nested Stops from the parser. `ProgramBackgroundWash` retains the fix: a flat array of actual keyed `Stop` elements with numeric offsets. Its optional surface color now supports the charcoal end fade. The other washes and the new shared hero also use direct Stops. No LogBox suppression or vendor patch is used.

The native regression fixture exercises the actual installed parser and demonstrates the old Fragment behavior, then verifies the corrected stop structure.

## 8. DateTimePicker

DateTimePicker 9.1.0 uses `onValueChange` and `onDismiss`. The previous fix remains: Android commits only a selected value; dismissal leaves the saved value intact. iOS updates a draft and commits through Confirm; Cancel/dismiss does not commit. Local calendar-date parsing and formatting are preserved, with tests across Europe/Rome, America/Los_Angeles and Pacific/Kiritimati, including DST. The visual program variant uses a dark picker/field palette.

## 9. Password UX

Signup and Reset Password retain live requirements derived from the Clerk policy, confirmation, independent visibility toggles, localized errors and accessible feedback. Satisfied checklist items now use sage and pending items use muted text. The policy reader and authentication flow are unchanged; no additional requirement or fixed eight-character policy is imposed on a known Clerk configuration.

There is no existing account Change Password screen in this branch. This visual pass does not introduce that new authentication feature. Passwords are not logged or added to persistence.

## 10. Avatar and status bar

Camera, gallery, remove, account-scoped local persistence and monogram fallback code are unchanged. Browser regression covers avatar selection/removal, account isolation and remount behavior using fixtures. Home/Progressi retain dark status-bar icons. Scheda/program branches use light icons. Profilo uses light icons over its dark hero and dark icons after scrolling into the light body.

## 11. Verification

- Requested viewports: 320 × 740, 390 × 780, 393 × 851 and 430 × 860. Browser tests cover hero alignment, crop containers, readable foregrounds, overflow, safe-area/scroll behavior, week 4 and accessible bottom content.
- Regression: Home, Scheda, program management/create/settings, date field, add/edit day, library/custom exercise/prescription, Progressi tabs/periods, Profilo/avatar, Signup/Reset Password and Android hardware Back.
- Unit tests: 159 passed, including the native SVG/date fixtures.
- Browser tests: all 41 cases passed across the full run and a targeted rerun. The first run passed 39 cases; two added theme assertions required filtering retained hidden navigation views. Their business assertions were unaffected, and both complete cases passed after the test selector correction.
- Final checks passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm format:check`. Credential scan passed across 608 source/export files without printing credential contents.
- Final Android/iOS/web export uses `EXPO_PUBLIC_AUTH_TEST=false`. Browser fixtures use a separate test export with the simulator enabled; Metro cache is cleared when switching. All checks run without database/OpenAI credentials, and browser API calls use intercepted fixtures.

No physical phone or emulator is attached. The native tests exercise JS components/parser against fixtures and do not replace a new Expo Go device check. On a development phone, confirm hero/status-bar transitions, week scrolling, picker Confirm/Cancel/Android Back, absence of SVG/picker warnings, avatar camera/gallery/remove/persistence and signup/reset requirements.

Fonts remain Cormorant Garamond for editorial headings and Inter for controls/metadata. Existing font assets, navbar, localization and reduced-motion behavior are retained.

## 12. Protected systems

No migration, seed, Neon connection, production operation or OpenAI call is performed. All 160 protected backend/database/schema, sync, AI, auth policy, avatar and workout files match their hashes at task start. The four new images match the pack byte-for-byte. No Git commit or push is part of this refinement.
