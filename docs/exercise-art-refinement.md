# Exercise artwork and bounded section heroes

This visual pass follows the supplied specification, `JIMO_exercise_art_pack.zip`, `README_CODEX.txt` and `ASSET_MANIFEST.json`. No artwork is generated or edited. Existing API, database, authentication, AI, sync and workout behavior are retained.

## Hero and body

`SectionHeroProvider`, `SectionHeroFrame`, `SectionHeroArtwork` and `section-hero-geometry.ts` centralize the boundary for Progressi, Profilo and Scheda. Their minimum height is responsive, and actual content measurements are shared so enlarged text/long names do not clip. The top safe inset is included in the artwork height. The background stops at the seam; later content uses the appropriate clean parchment or ink surface.

This presentation scope is independent from the approved Home geometry. Home's Kitsune, embedded JIMO lettering, crop, contents and rendering function remain unchanged. Navbar props/styles are unchanged. All four Home screenshots are byte-identical to the saved pre-change screenshots.

Progressi has no PROGRESSI title or associated brush. The unchanged four content tabs straddle the boundary, remain in one horizontal scrollable row, use sage selection and 48px targets. Periods and queries are unchanged; Volume retains “Per esercizio” / “By exercise”.

Profilo has no PROFILO title/brush. The existing Kappa background is visible without the previous broad parchment veil. Avatar/name/motto occupy the lower right, leaving the creature visible on the left. Local ink wash protects the identity copy. Statistics start in the light body. Settings retain their menu jump. Status icons are light over the dark hero and dark after scrolling into the light body. Camera/gallery/remove, account-scoped persistence and monogram logic are unchanged.

Scheda keeps SCHEDA, program name and its existing header action in the Oni hero. Weeks, day cards, overview, other programs and secondary creation start in the clean dark body. Existing day-card artwork is retained; there is no illustrated page background behind the body.

All program pages use the compact shared header token and an explicit `ProgramScreen.header` slot: manager, creation/method selection, create/edit form, structure, add/edit day, day detail, library/selection, prescription and custom exercise. Their original header controls/callbacks move intact into that slot. Fields, data rows and notices sit in an opaque ink body. Existing keyboard focus/reveal, footer, safe areas, date picker and contextual/hardware Back behavior remain in place.

## Recupero

Only the manual presentation changes. `RestControl` wraps the existing number control, stores raw seconds and formats 30/45 sec or 1:00/1:15/1:30/2:00. Null displays “—”. +/- changes exactly 15 seconds, including existing non-multiple values, bounded at the existing 0–86400 limits. New manual values start at 15 only after an explicit + action. A small “Non impostato” / “Not set” action clears the field to null. There are no rest preset chips or “Recupero personalizzato” caption. Direct numeric editing still uses seconds and retains the existing keyboard/confirmation behavior.

RPE, manual load choices, historical assistance values and schemas are unchanged. The inactive AI import editor keeps its original controls and missing-value semantics.

## Original assets and mapping

Twenty original PNGs, plus the original README and manifest, are copied unchanged into `apps/mobile/assets/jimo/exercises/`. The eighteen character PNGs have actual RGBA transparency; both card backgrounds remain separate files. The two `reference_only_not_transparent` images are excluded from mobile assets and runtime imports. Only this original manifest is excluded from Prettier, preserving its supplied bytes instead of reformatting the source-of-truth data.

| Artwork key    | Canonical names/examples         | Male     | Female           |
| -------------- | -------------------------------- | -------- | ---------------- |
| `pull_up`      | Pull-Up, Trazioni                | original | original         |
| `push_up`      | Push-Up, Piegamenti, Flessioni   | original | neutral fallback |
| `dip`          | Dip, Dips                        | original | original         |
| `plank`        | Plank                            | original | original         |
| `hollow_hold`  | Hollow Hold                      | original | original         |
| `squat`        | Squat                            | original | original         |
| `glute_bridge` | Glute Bridge, Ponte glutei       | original | neutral fallback |
| `lunge`        | Lunge, Lunges, Affondi           | original | original         |
| `stretching`   | Stretching                       | original | original         |
| `leg_raise`    | Leg Raise(s), Sollevamento gambe | original | original         |

The resolver uses exact normalized canonical aliases, not fuzzy substrings or guessed IDs. Bench press, lat pulldown, side plank, unsupported named variations and custom exercises use the neutral fallback. A failed image load also falls back safely.

`ExerciseThumbnail` composes card background, transparent character with `contain`, and the containing row's real UI text. PNGs are not merged, stretched or replaced by screenshots. Explicit foreground layering keeps fallback icons above the background on web. Thumbnail clicks belong to the existing selection/edit button; action menus remain separate.

Artwork is used in library/selection and day-detail rows, with compact dimensions and existing prescription metadata retained. The dark card background is used there. The reusable component supports the original light card background, verified in an isolated browser composition fixture. Home/Prossimi esercizi is deliberately unchanged because the specification explicitly freezes Home; its approved neutral presentation is preserved.

Male is the explicit presentation default. The female variant is supported by a component prop and has a neutral fallback for the two missing transparent files. No sex is inferred, no profile/backend field is added and no new preference is persisted. There is no account selection state to leak; independent male/female component instances are tested. A future account-scoped preference can supply the existing prop without changing the artwork registry.

## Verification and protected scope

- Requested viewports: 320×740, 390×780, 393×851 and 430×860. Tests compare the section boundaries, verify title removal, straddling progress tabs, dark bodies, short program artwork containers, scroll/overflow and accessible bottom content.
- Unit tests: 167 pass, including new exact mapping, missing female/custom fallback, manifest/RGBA references, rest formatting/null/15-second bounds and hero-token checks. Existing native SVG/date callbacks and Android Back tests remain included.
- Browser suite: 47 distinct cases pass across the full run and targeted reruns. The first run passed 44 cases; the auth title expectation and isolated SVG resolver/assertion were updated, and the unchanged Home-start case passed on rerun after a startup timeout. Core business assertions remain intact. Final thumbnail layering/row-target checks are rerun after the presentation correction.
- Home: four screenshots exactly match the pre-change snapshots. Its rendering function is byte-identical; navbar props/styles are equivalent.
- 214 protected core/Home/existing asset files match their task-start hashes. The original pack files are checked byte-for-byte. Auth, workout execution, TARGET/ACTUAL, offline sync, history, analytics, date/calendar semantics, password policy and avatar storage are unchanged.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm format:check` pass. Credential scan passes without printing credentials. Browser fixtures intercept API requests and use an auth-test export. The final Android/iOS/web export disables the auth simulator/AI import and clears Metro cache. Checks run without database/OpenAI credentials. The corrected thumbnail composition/program rows pass five targeted cases, and the final aligned rest control passes its prescribed input/null/step/persistence case.
- No physical phone/emulator is attached. Browser and native JS fixtures do not replace a new device session; camera/gallery and native status bar/keyboard behavior should be checked in Expo Go.

No migration, seed, Neon connection, OpenAI call or production operation. No real EMOM/pyramid, AI feature, commit or push is part of this task.
