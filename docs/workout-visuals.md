# Workout visual pack

The standard session and rest screen are React Native views based on the four
references in the supplied `JIMO_workout_visual_pack.zip`. Reference screenshots
are not bundled or rendered in the app.

The three original PNG assets are in `apps/mobile/assets/jimo/workout/` and are
copied without alteration. `workout-bg.png` supplies the sumi-e scenery,
`brush-divider.png` supplies the small brush stroke, and `timer-enso.png` supplies
the decorative track for the EMOM preview. The progress arc is SVG, computed
from remaining and total seconds; it is not baked into an image.

Workout uses a local charcoal/parchment/sage palette. Typography is Cormorant
Garamond Medium, locally bundled and loaded with Expo Font only in these views.
The static Medium font was instantiated from the official Google Fonts variable
font (`ofl/cormorantgaramond`, weight 500). Its SIL Open Font License is bundled
alongside the font. Utility notices retain the existing Inter font.

Standard controls keep the existing workout actions, validation, exact decimal
steps, SQLite persistence, correction, skip, synchronization and haptics. Tap a
value to enter it manually. Tap RPE to see its existing optional presets. The
exercise counter in the header opens session actions, including finish and
cancel. Rest continues to use persisted completion timestamps and the existing
foreground clock, including recovery after backgrounding. No workout engine,
API, database or migration changes are included.

EMOM and pyramid previews are available from the Workout tab and the session
actions menu. They use isolated modal components and sample values, with no
workout actions, storage, sound or network calls. The EMOM time and sound notice
are illustrative. Pyramid steppers change only local preview state, discarded
on close. Both views explicitly say that no workout is recorded.

## Deliberate differences from the references

- Athlete photographs are replaced by a neutral exercise placeholder. No new
  illustrations or generated exercise assets were added.
- Actual workout names, exercises, prescribed values and number of sets replace
  sample labels. Header counters also provide access to existing session actions.
- The supplied background is cropped responsively; its moon and scenery do not
  exactly match the separately composed reference screenshots.
- The pack contains no font. Cormorant Garamond approximates its serif lettering.
- Real device status bars and safe areas replace the mockup's static 9:41/icons.
- Touch targets are at least 48 points. Narrow screens, larger font scales,
  keyboard entry, notes, corrections and synchronization errors can expand or
  scroll the composition. The footer stays accessible above the keyboard.
- RPE presets appear during value editing, rather than filling the main layout.
- The primary button is drawn with a subdued sage SVG gradient instead of a
  photographic texture. No extra graphical assets were created.
- Preview labels make EMOM and pyramid clearly distinguishable from live
  workouts. Reduced motion has no added animations.

## Verification

`e2e/workout-visuals.spec.ts` covers the four layouts, 320/390/430 pixel widths,
48 point targets, timestamp-derived rest progress, and zero workout writes from
the previews. The existing workout and offline tests cover actual editing,
decimal values, all tracking/load modes, correction, skip, finish, resume and
sync. Browser tests use intercepted API fixtures and real local Expo SQLite;
run with `DATABASE_URL` unset to avoid the live database harness.

Native Android/iOS exports validate bundling; actual Expo Go/device rendering
still needs a device check. Open Workout → **Anteprima EMOM** or **Anteprima
piramidale** for the samples. Start/resume a real session for standard and rest.
