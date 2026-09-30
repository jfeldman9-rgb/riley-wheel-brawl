# 1.1 menus, saves and device-input review

## Changes

- Title and pause menus now include a three-page **How to Play**. The guide uses the current keyboard, touch or controller bindings.
- Back from paused Options, Controls or How to Play returns to the pause menu. A second Back resumes. Start/Options on a standard-layout controller opens pause during a fight.
- Story reels can pause, open settings/help and resume the same caption. Blur or hiding the tab pauses the reel. Resume replays its current voice line; it does not skip the caption.
- Touch settings use four generously spaced rows per page with persistent Previous, Back and Next buttons. Pause and title items have larger touch rows. Phone portrait remains available and shows a non-blocking suggestion to rotate for larger controls.
- Touch combat contacts stay attached to the button first pressed. Sliding to a neighbour cancels the original contact instead of spending Loial or saidin. Pointer cancellation, lost capture and multiple contacts release safely.
- The standard Xbox and PlayStation layouts use A/Cross to confirm and B/Circle to go back in menus. PlayStation-identifiable controllers show Cross/Circle/Square/Triangle labels. Start/Options and the d-pad remain fixed; Escape and arrows remain available even after remapping.
- Stick navigation produces one edge per deflection rather than repeatedly selecting menu rows. Controller disconnect pauses a scene with a pause handler. Focus loss cancels remapping and clears held actions; a held pad button must be released before it can trigger again.
- Continue retains stage, wave, difficulty, boss state, Callandor, Loial use, meter and lives. Existing version-2 saves without a difficulty retain Normal. Callandor acknowledgement remains separate from the gameplay checkpoint.
- Game Over has separate touch Continue and Title buttons, and timeout/confirm cannot schedule competing transitions.

## Executed evidence

`node tools/v11-menu-check.cjs`: **20 grouped checks passed**. Includes all 30 stage/wave checkpoints on Hard, five legacy-save stages, all five boss checkpoints, interrupted Callandor reveal, repeated pause/settings/resume on all stages, story groups, clear/death pause, touch hit geometry, and synthetic Xbox/DualSense input.

`node tools/release-check.cjs`: **19 unchanged release assertions passed** after these changes.

`docs/review/v11/menu-*.png` are offline Canvas renders using the bundled font, visually inspected for clipping and overlap. They are not browser screenshots or photographs of devices. The title render uses the existing missing-art fallback in this Node harness.

## Browser and physical-device limits

`CHROMIUM_PATH=/usr/bin/chromium node tools/v11-device-browser.cjs` could not start Chromium locally: its process singleton Unix socket returned `Operation not permitted`. `docs/review/v11/device-browser.json` records **blocked**, with zero completed browser assertions. This is not a browser pass.

The new script is ready for an unrestricted browser/CI runner. It uses actual Chromium keyboard/touch event plumbing at desktop, 1024×768 iPad-like landscape and 844×390 phone-like landscape viewports, plus injected standard Gamepad objects. It also checks portrait guidance, repeated nested Back/resume and controller disconnect fallback. These are emulations even if they pass in CI.

No physical iPad, phone, Xbox controller or PlayStation controller was available. Safari/WebKit, browser-specific controller mapping, Bluetooth reconnect behavior, notch/safe-area ergonomics, and real thumb reach remain manual checks. Landscape gameplay target diameters are at least 44 CSS pixels at the tested dimensions; portrait controls are smaller, hence the rotation suggestion. Nonstandard controller mappings may need Controls remapping.

## Reproduction

```sh
node tools/v11-menu-check.cjs
node tools/release-check.cjs
node tools/locked-tests-v11.cjs
CHROMIUM_PATH=/usr/bin/chromium node tools/v11-device-browser.cjs
```

The new checks do not relax any inherited gameplay, image or frame-time threshold. Version-stamp metadata changes are tracked separately by the inherited-test lock checker.
