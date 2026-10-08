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
on close. A small PREVIEW badge replaces the full-width notice; the EMOM info
action explains that no workout is recorded.
The pyramid completion CTA is a disabled visual sample. It cannot complete sets.
Both Standard's live completion button and this sample have a solid, static sage
background with no SVG fill, animation, progress, countdown or time limit.

## Correction without leaving the session

`SetCorrectionModal` opens a transparent native Modal over the still-mounted
workout/rest view. It uses the existing actual editor, validation and local save
action with correction=true. Opening, cancelling and saving do not navigate.
The next set's unsaved draft and the underlying scroll/background remain intact.
The modal's software Back and onRequestClose (native Android hardware Back) only
close the correction. The central session handler also prioritizes an open
correction before keyboard dismissal or ordinary navigation.

The session owns the existing foreground clock throughout editing. Corrections
preserve completedAt; remaining rest derives from that timestamp and the current
clock, never from modal open/save. If rest expires during editing, the existing
rest view stays mounted at zero until the overlay closes; the normal next-set
view then appears. No set is automatically completed. Cached workout data stays
visible during background refetch errors, instead of replacing it with loading.

## Device fitting and back navigation

Workout-only `SafeBack` checks navigation history at press time and falls back
to the Workout tab when a session is opened directly. The helper supports
Program and Home fallbacks for other contexts. Preview back buttons and native
modal hardware back dismiss the preview without navigating. The Android session
handler closes correction first, otherwise dismisses an open keyboard or uses
SafeBack, consumes the event, and unregisters on blur. The Workout tab keeps its existing explicit
Resume action instead of immediately reopening a session after Back.

Standard and pyramid reserve no space for missing artwork: there is no dumbbell,
placeholder box or empty image slot. `ExerciseHero` accepts an optional imageUri;
only actual artwork allocates an image frame, and image load failure collapses it.
The exercise name always remains. Responsive labels and controls are retained.
Visible +/- circles are 42 points inside 48-point touch targets.
The scroll viewport and non-shrinking footer are separate, so the CTA cannot
cover RPE or other fields. Layout dimensions account for usable safe-area height.

Rest keeps its timestamp-driven timer, next target and last completed set, with
only Back and RECUPERO in its header. Its ring and spacing adapt to screen height.
EMOM retains static sample values and its illustrative sound notice, with lower
indicators fitting above the navigation inset. Pyramid has optional artwork,
compact vertical progression, and a softly fading sage highlight
for the current row. Neither preview starts timers, plays sounds or saves data.

All four views are fullscreen. Preview modals provide their own safe-area context.
No product settings button is present in these views. Expo Dev Menu, React Native
LogBox and Clerk development notices are unchanged.

## Deliberate differences from the references

- Athlete photographs and the former exercise placeholders are absent when no
  actual artwork is available. No new graphical assets were added.
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
- The primary button uses a solid, static sage background instead of a
  photographic texture or SVG fill.
- Preview labels make EMOM and pyramid clearly distinguishable from live
  workouts. Reduced motion has no added animations.

## Verification

`e2e/workout-visuals.spec.ts` covers the four layouts, 320/390/430 pixel widths,
48 point targets, timestamp-derived rest progress, and zero workout writes from
the previews. The existing workout and offline tests cover actual editing,
decimal values, all tracking/load modes, correction, skip, finish, resume and
sync. Browser tests use intercepted API fixtures and real local Expo SQLite;
run with `DATABASE_URL` unset to avoid the live database harness.
`e2e/workout-fitting.spec.ts` additionally checks 320×740, 390×780, 430×860 and
393×851 viewports with simulated Android/iOS status and navigation insets, footer
separation, initial visibility, fullscreen modal coverage, deep-link fallback,
history Back, and zero preview writes. These are browser layout simulations, not
physical-device tests. `test/safe-back.test.ts` verifies history resets, contextual
fallbacks, modal dismissal and Android hardware-handler consumption/cleanup.
`e2e/workout-correction.spec.ts` covers missing artwork, static live/preview CTAs,
no automatic saves, modal open/save/cancel/software Back/onRequestClose without
history events, unchanged DOM/scroll identity, timestamp-based rest during editing
and after save, expiry while the modal is open, and preservation of the next-set
draft. The fitting suite also verifies correction controls and footer in each
safe-area viewport. Existing tests exercise last set → exercise completed →
continue without changing the workout route or losing actual data.

Native Android/iOS exports validate bundling; actual Expo Go/device rendering
still needs a device check, including physical Android hardware Back. Open
Workout → **Anteprima EMOM** or **Anteprima
piramidale** for the samples. Start/resume a real session for standard and rest.
