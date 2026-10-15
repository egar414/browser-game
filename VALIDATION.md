# Validation — Wharf, spray, shoals and aerial poses

16 October 2026 (Australia/Brisbane). See the Git history for the application
commit and GitHub Actions for the deployment result.

## Environment

Node.js 24.19.0, npm 11.9.0, Chromium 154 on Linux / AMD EPYC virtual CPU,
SwiftShader software WebGL rendering. Browser checks use keyboard interaction
and Chromium native multi-touch emulation. This is not a physical laptop or
phone GPU benchmark, or a subjective human driving review.

## Completed simulation and geographic checks

- **59 Node tests pass** and the production build passes. Coverage includes both
  craft's distinct acceleration, steering, braking/reverse, buoyancy, trim/modes,
  planing, sustained bow riding, ramp/wave launches, landed spins, collision,
  recovery, storage, score limits, progression, battle flooding and weather.
- The new Wharf launch is within 80 m of the mapped Wharf footprint centre and
  has 12 m collision clearance. A continuous river-to-ocean route remains open.
  Every mapped channel centre remains clear with the target platforms present.
- Estimated shoals increase local wave range and leave canal waves sheltered.
  GPU readback from the compiled shared wave shader agrees with CPU height at
  eight ocean/entrance/river/canal samples within **0.000174 m**. This verifies
  the sampled equations, not surveyed bathymetry or complete hydrodynamics.
- Rear spray packets remain visible through descent and return to moving water;
  the pool is finite and clears on recovery. Idle, airborne, reverse and dry
  contact restrictions remain covered. Droplet drag and pump forces are tested.
- Aerial holds need at least 0.35 seconds above water. Each pose qualifies only
  once per jump; rough landings discard it. Ground input and inactivity score
  nothing. A hard collision on the landing step cannot also bank air points. A simulated Hangman banks only after a clean landing.
- Targets require actual powered spray overlap and speed. They score once and
  need both a 25-second cooldown and departure beyond 40 m to rearm. Inactivity
  does not score; platform collision and channel clearance are covered.

## Browser and visual checks

The twelve existing acceptance flows cover both craft driving/spray/steering/
braking/reverse/recovery; Low/Medium/High and reflections; bow rides; race start,
restart and challenge controls; camera, pause, focus, resize, help and settings
persistence; phone multi-touch, rotation and portrait fallback; sea/garage/battle
menus; and GPU wave readback. The four final reruns (coastal menus, all graphics profiles, race activities and phone Thundercat) all passed; combined with the initial nine passes, every one of the twelve distinct flows passed. No single uninterrupted twelve-test pass is claimed.
The initial full run passed nine flows; the release identifier expectation was
updated and race-start / phone-outboard reversal were rerun with longer wall-time
budgets for software rendering. Assertions were retained.

The development-only `tools/watercraft-preview.html` exercises the actual vehicle,
water, rider and spray systems in a small scene. Actual keyboard driving verified
ramp launch → held Hangman → clean landing with a single Hangman award, plus a
powered carve past the Mayes Canal bullseye → one hit / 150 points. Straight and
turning spray, the aerial pose and steepened shoal waves were visually inspected.
The final four-view run completed without page or console errors. An earlier
run during development logged a geometry-bounds warning; the stable final run
and production graphics checks did not reproduce it.

The actual game Wharf launch and mobile layouts were inspected in Chromium.
First-pass target sensitivity was too low; sampling across the bullseye and
increasing its soak response made the driving pass register. Rear sprites have
soft noisy edges and a mix of cloud packets / fine falling streaks, replacing
the old continuous tube. Rendering remains stylised, not photorealistic.

## Material limits

The shoreline, buildings, piers and named channels use retained OpenStreetMap
geometry; The Wharf launch follows it. The entrance shoals are authored estimates
from the user's description: the extract contains no surveyed shoal depths.
Signs and targets are original game placements, not an inventory of actual
regulatory signs. The game is not suitable for navigation. No Google imagery
or new bathymetric/building survey was used.

Water uses an exposure field, directional swell and local harmonic steepening;
it does not solve breaking curls, tidal currents or real shoaling/refraction.
Spray packets approximate groups of water droplets and remain artistically
amplified. Air poses are stylised game animations. Bow riding has arcade
assistance; displayed performance values are approximate. The supplied photos
and video informed the visuals, without measured or manufacturer validation.

Physical Android/iOS, Safari/Firefox, hardware GPU frame rates, large-scale
playtesting and unattended real-time hourly changes remain untested. The full
15-gate race was browser-completed in the previous release; this update checks
its route, race logic and launch/start/restart flow, rather than claiming another
full driving completion. All assets are bundled; no play account or API key is
needed for this single-player release. Multiplayer is a separately requested
next phase and is not part of this deployment.


## Dense jet-ski spray revision — 15 October 2026

The central jet-ski plume now emits more overlapping water packets, with a
dense white core, turbulent shading, finer mist and velocity-aligned droplets.
Pool sizes and emission caps preserve the falling arc on Low quality.
Thrust, handling, side spray and Thundercat behaviour are unchanged.

Validation on Linux Chromium 154 with SwiftShader:

- `npm test`: 60 passed, including a sustained dense-plume test checking
  bounded pool use, descending water, surface impacts, finite GPU attributes
  and expiry after throttle release.
- `npm run build`: passed.
- Three actual-browser flows passed: jet-ski driving/spray/brake/reverse/recovery;
  all graphics profiles/reflection changes; native phone multi-touch driving
  and recovery. No critical runtime or shader errors occurred.
- Visually inspected a powered carve and the subsequent falling water using
  normal controls in the watercraft inspection scene. The supplied video
  informed density and breakup. The result remains stylised particle water,
  not a measured fluid simulation.

These targeted checks cover this spray revision; they do not claim a repeated
full race, physical-phone testing or hardware GPU performance measurement.
