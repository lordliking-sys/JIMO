# Login visual refinement

The sign-in credentials view follows `01_LOGIN_MOCKUP_SOURCE_OF_TRUTH.png`
from the supplied login visual pack. The reference screenshots are not bundled
as interface elements. Email, password, visibility toggle, submit and secondary
links remain real, accessible React Native controls.

## Original asset mapping

The following files are copied byte-for-byte into
`apps/mobile/assets/jimo/auth/login/`:

- `02_LOGIN_BACKGROUND.png`: fixed full-screen background, using cover.
- `03_PASSWORD_LIFTER_TRANSPARENT.png`: centered below Password, cropped by its
  layout container to show the supporting hands, arms, head and upper torso.
- `04_EMAIL_FAIRY_TRANSPARENT.png`: anchored to the upper right edge of Email.
  A layout transform mirrors it so the wings extend toward the outside edge.

No graphic assets are generated or edited. Decorative overlays ignore pointer
events and are excluded from accessibility navigation.

## Composition and interaction

`src/auth/login/geometry.ts` scales the composition to the available width and
safe area. The crop and vertical breathing space adjust to keep the CTA and
links visible on compact portrait screens. Fields use satin blush surfaces,
thin borders, soft contact shadows and subtle SVG highlights. The CTA uses a
small pink gradient, soft shadow and a 120 ms press scale, respecting reduced
motion. Fonts are the existing Inter 400, 500, 600 and 700.

The existing keyboard-aware Screen scrolls the focused input into view. The
composition retains its height when an Android keyboard reduces the window;
sprites scroll with their inputs and the background remains fixed. A width
change recomputes the composition for orientation changes. Larger font sizes
and landscape can scroll instead of hiding controls.

AuthForm selects this visual view only for sign-in credentials. Its submit,
validation, pending lock, provider calls, verification stages and navigation
callbacks are unchanged. PasswordField receives an optional visual appearance;
visibility, password-manager attributes, signup and reset behavior remain as
before. Clerk, token handling, translations, API, database and environment
configuration are unchanged.

## Verification

The isolated browser fixture renders the actual AuthForm against a simulated
provider and loads the actual artwork and fonts. It verifies 320×740, 360×800,
390×780, 393×851, 412×915 and 430×860, real input focus, eye interaction,
autofill attributes, safe area, artwork anchors, visible 48 px controls,
portrait resize simulating a keyboard, landscape, error/loading states,
duplicate-submit protection and existing navigation/verification callbacks.
The existing signup/password/reset browser regressions are also exercised.
Press animation is checked with normal and reduced motion. All 16 selected
browser cases and all 192 repository unit tests pass.

Repository checks: lint, typecheck, unit tests, format check and Expo export for
Android, iOS and web. Credential scanning and original PNG checksum checks
verify the artifact and assets. These checks do not contact real Clerk, Neon or
OpenAI; no migrations or production changes are performed.

Keyboard tests use a browser resize, not an Android IME. An actual Expo Go
device check remains necessary to confirm native keyboard appearance and visual
shadows on the intended handset.

## Files

- Updated: `src/auth/AuthForm.tsx`, `src/auth/PasswordFields.tsx`.
- Added: `src/auth/login/assets.ts`, `geometry.ts`, `LoginField.tsx`,
  `LoginScreen.tsx`.
- Added original assets: the three PNGs listed above.
- Added isolated browser tests: `e2e/login-component.ts`, `login-harness.tsx`,
  `login-mocks.tsx`, `login-visual.spec.ts`.
- Updated password test fixtures: `e2e/password-component.ts`,
  `password-mocks.tsx` (browser global and focused-screen hook).
- Added this document. All unrelated working-tree refinements are preserved.
