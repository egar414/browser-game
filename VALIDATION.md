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


## Thundercat / bow-ride spray and rider update — 15 October 2026

- `npm test`: 63 passed. New checks cover powered bow-ride launch direction
  and reach, bounded side-sheet history at 120 Hz, expiry after emission stops,
  smooth rider countersteering and the attached tiller hand. Existing sustained
  Thundercat bow-ride and propulsion tests continue to pass.
- `npm run build`: passed.
- Four real-browser flows passed in Linux Chromium 154 / SwiftShader:
  Thundercat driving, steering, spray, braking, reverse and recovery; all quality
  profiles and reflections; jet-ski bow riding, pause, settings, save/reload,
  resize and blur; Thundercat bow riding and settling with normal controls.
- Inspected bow-riding and countersteering on both craft in the development
  watercraft scene, including a closer rider view and the final textured
  Thundercat sheet. No runtime or shader errors occurred in those runs.

The initial rider attachment test selected the wrong unnamed scene child;
named hand attachments made the assertion stable. No physical phone or
hardware GPU performance measurement is claimed. Width, density, rider
poses and bow-ride spray amplification remain stylised game approximations.


## Spray performance and a findable bar — 16 October 2026

- `npm test`: 66 passed. New checks cover live side-spray attachment between
  history samples, rear-jet travel with inherited momentum, clear bar route
  segments and a safe direct launch within the authored shoal field.
- `npm run build`: passed.
- Six distinct Chromium 154 / SwiftShader browser flows passed across targeted
  runs: both boats' driving/spray/brake/reverse/recovery, all quality settings,
  desktop bar guidance, native-touch phone guidance/direct travel, and desktop
  direct travel/full SVG map/driving/return to the Wharf. The latest three
  runs exercised the new bar sets, direct travel and all water quality shaders.
  No critical runtime or shader errors remained.
- The full physical-input route from the Wharf reached the bank in 177.75
  simulated seconds, with a clean wave-hop landing and no wipeout. All route
  segments are also collision-sampled. A separate actual-browser long drive
  covered the early river legs before being stopped because the cloud software
  renderer made a full trip excessively slow. A complete browser-driven
  Wharf-to-bar trip is not claimed. Browser direct travel and wave-zone driving
  did complete; the shoreline, local crests, larger map and phone HUD were
  visually inspected.
- The first desktop guidance test used an old settings fixture that correctly
  migrated to hourly weather. Updating the fixture to a current saved record
  verified calm-to-swell behavior; hourly weather is separately preserved.
- The isolated fixed-plume benchmark at 1000×650 / Low recorded 40 frames after
  warm-up: median 416.7 ms before versus 100.0 ms after; P90 483.3 versus
  166.6 ms. This is a deliberately heavy software-rendering stress case, not
  full-game or hardware-GPU performance. See RESEARCH.md and the benchmark tool.

Physical mobile devices and new marine surveys remain untested/unavailable.
The sandbanks and short steep sets are original game estimates, using matching
CPU/GPU wave functions; there are no physical overturning wave curls. No Google
imagery or newly measured depths were obtained. Multiplayer is still a separate
prepared branch and is not enabled by this release.


## Left-hand bar, curved kicker and boat swaps — 16 October 2026

- `npm test`: 69 passed. Added checks cover curved-ramp takeoff/landing for
  both craft, same-position swaps at sampled water height, and legitimate deep
  troughs without a false recovery. Route and marker clearances cover the new
  left-hand bank.
- `npm run build`: passed.
- Five actual-browser flows passed in Linux Chromium / SwiftShader: desktop
  bar guidance and swell selection; phone touch guidance/direct travel/boat
  swap; desktop direct travel/map/driving/same-position swap; a real curved
  kicker takeoff and scored clean landing using normal controls; all graphics
  profiles and reflection switching. No runtime or shader errors were reported.
- Inspected the ramp takeoff and landing, left-hand bar route map and phone
  flow screenshots. Both craft also completed ramp launches and clean landings
  in physics simulations at seven different swell phases each, without wipeouts.

The shoal placements and waves remain authored gameplay approximations, not
surveyed Mooloolaba depths. The floating gold ramp is a game feature. Phone
checks used touch emulation; physical devices and hardware GPU performance
were not tested. Multiplayer remains disabled.


## Tender 225, house pontoons and falling-spray flooding — 16 October 2026

- `npm test`: 77 passed. New checks cover the third craft's 25 hp tuning,
  planing, powered slides, reverse, trim, bow riding, buoyancy and rider/tiller
  attachment; all three craft flooding a tender; no flooding from idle, dry or
  absent spray; a finite sink/reset cycle; route clearances; draw-distance
  compaction independent of simulation; and normal powered spray passes at
  six different wave phases.
- `npm run build`: passed. The existing large vendor-chunk warning remains.
- Eight distinct actual-browser flows passed across targeted runs in Linux
  Chromium 154.0.8037.57 / SwiftShader: jet-ski, Thundercat and tender keyboard
  drive/steer/spray/brake/reverse/recover; all graphics profiles/reflections;
  native-touch tender driving; phone bar guidance and boat swap; the tender's
  normal-input pontoon spray/flooding/pause/same-position swap; and a real gold
  kicker takeoff with a banked clean landing. The last two ran again against
  the final app build after the world-boundary placement fix.
- The full generated environment was collision-sampled along mapped channel
  centres and race legs in the browser, with all 320 house pontoons and 338
  moored tenders registered. Those passages remained clear. Pontoons also
  reserve the bar route, existing targets/signs and playable world margins.
- Visually inspected the open alloy hull, bench seats, fuel tank, 25 marking,
  outboard and tiller rider in a close development view, plus garage, canal,
  carve and touch screenshots. A separate accelerated development fixture
  using the same moored renderer/flooding system showed water inside the hull
  at 55%, sinking at 100% and restoration to a dry floating hull. The actual
  main-game browser flow independently confirmed falling spray increases its
  moored-boat meter and survives a craft change. No critical runtime/shader
  errors occurred in the passed flows or visual fixture.

The first broad browser run exposed slow software rendering when every tender
was submitted; visible-instance compaction now limits the drawn fleet by viewing
distance. A populated-canal diagnostic at 960×640 / Low recorded 2.3 FPS, 249
draw calls and 557,345 triangles in cloud SwiftShader. This is a software renderer,
not a hardware-GPU or physical-phone performance measurement; no universal
frame rate is claimed.

The tender initially inherited the faster boats' acceleration assertion; its
check now requires its own lower speed while retaining the original thresholds
for the jet ski/cat. Reverse diagnostics showed negative thrust and clear water;
the unchanged reverse-speed assertion needed more wall-clock time on this slow
renderer. The spray test also held steering while taking a slow screenshot,
overshooting the aimed pass; controls are now released before capture. Actual
falling-water detection additionally samples five strands of each fan and
interpolates its swept gunwale crossing rather than its frame-end position.

Moored water volumes, sink thresholds and reset timing are gameplay approximations.
Sinking was exercised fully in simulation and the visual fixture; a complete
sinking cycle driven solely by a human in the main game was not tested. Phone
checks use Chromium touch emulation, not physical iOS/Android devices. Moorings
and estimated houses are authored game scenery rather than surveyed properties.
Multiplayer/accounts remain disabled.


## Easier tender bow lift / stern slides, smaller fans and spray bounce — 16 October 2026

- `npm test`: 80 passed. New checks require a sustained loaded turn to kick
  the stern, produce bounded water-relative heave without flight/wipeout, and
  settle with grip restored after Shift release. Idle, cruise, dry contact and
  airtime cannot trigger powered bounce. A fixed loaded spray fixture also
  constrains outward/upward speed to the smaller requested fan envelope.
- `npm run build`: passed.
- Four Chromium 154 / SwiftShader browser flows passed: tender keyboard
  drive/spray/brake/reverse/recover; native-touch phone driving; a normal
  smaller-fan pass flooding a moored tender while preserving pause/swap state
  and clear channels; and easy bow lift, sustained water-relative bouncing
  through a powered turn, and clean settling after releasing Shift.
- Inspected the bow-up, loaded turn, smaller fan and settled screenshots.
  The game uses the same desktop and touch controls; no jump input was added.
- Earlier tests sampled one instant of a continuous fan. They now check its
  wet-phase peak over a turn because catch/release intentionally pulses the
  water contact. The flood receiver fixture moved from 10 m to 7 m for the
  shorter tender fan, retaining its full sink/reset assertions. Production
  pontoon travel now gives the tender an 18 m run-up; normal spray passes were
  tested at six wave phases.

These are tuned arcade reactions and a bounded pressure-cycle approximation.
No real hydrodynamic porpoising model, physical-phone test or hardware-GPU
performance measurement is claimed. Other craft retain their existing tuning.


### Follow-up: easier sinking

Successful side/rear hits deliver twice the previous gameplay water volume;
slow drainage is halved. The normal-input physics pass now requires more than
15% flooding across six wave phases; measured results were approximately
19–23%. Existing idle/dry/absent-spray guards, full sinking, collision removal
and finite reset checks remain active. The receiving footprint is unchanged.

## Video-reference tender / Thundercat response — 16 October 2026

- `npm test`: 82 passed. Added early lift and 15-second grounded bow-hold
  checks for both outboards, including stern-deck clearance, powered steering
  and clean settling. Added bounded Thundercat loaded-turn rocking, useful
  side spray, distinct yaw limits and grip restoration checks.
- Existing sustained Thundercat >60 gameplay km/h bow rides at 0/5/8 degrees
  trim, ramps/landing, reverse, idle scoring, four-point buoyancy, actual
  flooding/sinking/reset and navigable-route checks all passed.
- Six normal-input pontoon approaches each leave >28% water aboard, measured
  approximately 30–44%. Actual falling gunwale crossings remain necessary.
- Production build passed. No new geometry, textures or particle budget.

Initial tuning exposed transom immersion at the steeper bow angle and lost
high-speed performance. Support was moved aft and high-speed bow attitude
balanced lower; original stern-clearance and >60 km/h assertions now pass.
The tender heave guard was updated for the deliberately larger reference-like
catch/drop travel, remaining bounded below 0.65 m relative to stern support;
it still rejects airborne or wipeout states throughout the loaded turn.
Browser validation follows below. Physical phones and real hydrodynamic
accuracy remain unverified; tests use Chromium 154 / SwiftShader.

Five browser flows passed: the normal tender pontoon spray pass with pause,
boat swapping and route-clearance checks; early bow lift, sustained loaded
turn and settling for each outboard; and native multi-touch acceleration,
steering, brake/reverse and recovery for each outboard. The pontoon flow was
rerun successfully after the final captured-water tuning. Inspected the
new tender bow-up view and phone layout; hosted Thundercat visual review is
part of the release check. No critical runtime errors occurred in these flows.

## Upstream / western map extension and bridge pass — 16 October 2026

- 85 simulation tests passed, including all mapped channel passages, existing
  island race, Wharf-to-mouth/bar guide, support collisions, falling-spray
  flooding and the previous video-reference handling checks.
- New checks cover added geographic bounds/source hashes, mapped pools,
  bridge names and tagged widths, paired road/sidewalk deck levels, overhead
  collision bands and clear water passages, connected road approaches, and
  all three craft driving in the new upstream Wyuna reach without a reset.
- Rebuilt the map into a separate temporary output and compared it byte-for-
  byte with the checked-in JSON: identical. The production build passed.
- The smaller-map building-count assertion was updated to require the expanded
  coverage. Bridge passage checks now sample actual water crossings instead
  of the endpoint chord midpoint, which can lie on land on a bent bridge.
- Extending river vertices exposed the old bar-guide fixed index. Stable
  entrance anchors retain the tested route. Paired sidewalk/road deck heights
  were also aligned after collision checks exposed the original mismatch.

Browser/visual results are recorded after completing the release checks below.
This is a geometry/coverage pass. Exact present-day houses, bridge structures
and measured clearances are not established by this data. No new aerial
imagery, LiDAR or Microsoft footprint import is claimed. Physical phones and
hardware-GPU frame rates remain untested.

Four browser flows passed: upstream desktop driving in both outboards with
same-position swapping and return to the bar; landscape phone shortcut/native
GO input; the existing normal-input pontoon spray, pause/swap and channel
clearance flow; and the coastal mode/loadout/persistence/battle menu flow.
The upstream test originally released throttle immediately on reaching speed,
before travelling its required distance; it now waits for actual movement.
The final menu check exposed battle HUD latency while the first rival frame
rendered. Battle start now updates the HUD immediately; that check passed.

Inspected Medium-quality bridge, upstream and housing views, the full SVG map,
and the upstream desktop/phone game screenshots. No critical runtime errors.
On Linux Chromium 154 / SwiftShader, the three Medium scenery views reached
capture in roughly 21–26 seconds including first rendering, with 165–401 draw
calls and approximately 0.92–1.31 million rendered triangles (reflections
included). This is software-renderer inspection, not a hardware-GPU FPS claim.

## Free-roam local traffic — 16 October 2026

- 91 Node tests pass, including six new traffic checks: directional canal patrols,
  all six craft moving with clear passing lanes, no idle flooding, quiet-water
  freezing, safe join positions, actual moving-target spray hits from ski/tinny/
  Thundercat, receiver reindexing, finite swamping reset, no ambient score awards,
  ducking driver pose and saved preferences.
- A separate ten-minute fixed-step run kept all six craft moving at the end,
  with zero forced recoveries, zero idle water aboard and no emitted soak events.
- The NPC models batch static hull/motor geometry while retaining animated rider,
  tiller and propeller transforms. Visible traffic is distance/quality bounded.
- A six-minute CPU simulation using the full scenery builder (317 pontoons,
  335 moored tinnies and all map collisions) also ended with all six locals moving,
  zero recoveries and no idle flooding. Only canvas texture drawing was stubbed;
  the collision geometry was generated by the shipped builder.
- Both new browser checks pass in Linux Chromium/SwiftShader: actual keyboard
  jet-ski spray put about 12% water aboard Gaz’s moving tinny in free roam;
  pause, quiet-water saving/reload, find-locals and race traffic gating work.
  Native simultaneous phone touches drive and carve a Thundercat alongside AI
  traffic in landscape, with at most three visible locals on Low. Screenshots
  were visually inspected. Physical iOS/Android hardware remains untested.
- The production build passes. Static-server publication is verified separately
  after deployment; these browser tests used the local Vite server.

## Laptop graphics pass — 16 October 2026

- All 91 existing Node tests pass after the visual changes. Production build
  passes; gameplay physics, wave sampling and spray scoring are unchanged.
- Chromium rendered Low, Medium and High through normal pause/settings menus
  with no page or shader-console errors. Each profile reports 3,636 ground
  contact instances at the Low-generated scenery density used by this check.
  Low disables cast shadows/reflections; Medium and High enable the configured
  1,024/2,048 px shadows and 20/30 Hz reflection limits. Settings can switch back
  to Low safely. Screenshots were inspected.
- This environment uses Linux Chromium with SwiftShader software WebGL. The
  initial compilation/profile-switch samples were around 0.5–0.7 fps; they are
  not a warmed-up hardware benchmark. A physical laptop/GPU and real mobile
  hardware remain untested. No universal frame-rate target is claimed.
- A separate interactive browser pass confirms desktop Auto starts on Medium,
  with 4,893 contacts at that initial scenery density, then reaches ~10.9 m/s
  during a normal keyboard carve. A touch-emulated landscape phone starts on
  Low, drives the Thundercat at ~9.2 m/s and steers using simultaneous touches
  alongside free-roam AI. Neither run logged runtime/console errors or wiped
  out. Garage, waterfront and driving screenshots were visually inspected.

## Sculpted coast / Fortnite-inspired direction — 17 October 2026

- 91 Node tests pass and the production build passes for the art pass. Vehicle
  physics, wave heights, routes and scoring were not edited.
- Low, Medium and High render and switch through the real settings menu with
  no shader-console or page errors. Visible-scene samples at the Wharf were
  about 1.06–1.42 million triangles and 451–562 draw calls. Solid crowns and
  bevels add geometry; no hardware frame-rate improvement is claimed.
- A source crown has 160 triangles, a 1.3623 m bounding radius, finite positions/
  normals/colours and an opaque material. Existing tile instancing is retained.
- Desktop Auto starts at Medium and a normal keyboard carve reaches ~11.0 m/s;
  phone landscape touch emulation starts at Low and drives/steers the Thundercat
  at ~8.8 m/s alongside AI. Both runs finish with no errors or wipeouts.
- Garage and canal screenshots were inspected. Inspection caught wall bevels
  covering the 0.09 m offset window panes; bevel width was reduced to 0.045 m.
  Final Low-quality waterfront inspection confirms the windows are visible
  again; the verification run logged no runtime or console errors.
- Checks use Linux Chromium/SwiftShader software rendering. Cold profile samples
  around 0.4–0.54 fps are not physical-laptop measurements. Real laptop/phone
  GPU performance remains untested.

## Thundercat bar-wave freeboard fix — 17 October 2026

- Reproduced complete tube-crown submergence in a deterministic strong-swell
  cruise: all six upper-tube sample points briefly went below the wave surface,
  with the highest point about 0.15 m underwater. The model's top faces were
  outward-facing; a vertical support lag was a confirmed cause of hiding it.
- Water-relative heave damping and bounded reserve buoyancy now keep at least
  one crown sample over 0.05 m clear in 30-second fixed-step cruise/spray/bow
  scenarios for calm, chop, swell and deterministic hourly conditions. Tests
  also require continued average hull-water contact and bounded vertical speed.
- All 93 Node tests pass, including the new bar-wave regression and a recovery
  history reset check. Existing bow rides, steering, spray hits, races, buoyancy
  and recovery checks remain green. Production build passes.
- Actual desktop Chromium interaction at Medium drives the coral Thundercat
  through the bar's Rolling swell, reaches ~12.1 m/s in a powered carve, and
  reports no wipeout or runtime/console errors. Cruise/carve screenshots were
  visually inspected and show both pontoons above water.
- These checks use Linux Chromium/SwiftShader, not physical laptop or phone GPU
  hardware. This is approximate game buoyancy, not validated marine physics.
- The landscape phone touch-emulation pass at Low also completes a powered
  Thundercat carve in Rolling swell at ~12.5 m/s with no wipeout or errors.
  The resulting screenshot was visually inspected before publication.

## Search discovery and no-JavaScript information — 18 October 2026

- Production build and all 93 existing Node tests pass. The search change does
  not edit physics, waves, vehicles or activities.
- Chromium launches the game, loads the detailed jet ski and drives beyond
  4 m/s with no runtime/console errors. The new About link is visible on launch.
- With JavaScript disabled, Chromium can read the game introduction, follow
  the About link, read the complete information page and return to Play.
  Metadata, canonical URL, index/follow directive, VideoGame JSON-LD, alternate
  “Eastary Rats” spelling and the 1,200 px preview image were checked from the
  production server. The About page fits a 390 px phone viewport without
  horizontal overflow. Desktop and phone screenshots were inspected.
- Sitemap XML is valid and lists the canonical game and About addresses.
  The original sharing image is an actual 1,200 × 630 game screenshot.
- Search Console ownership verification and indexing requests were not
  performed. No Google verification token was supplied. Published crawlable
  content and metadata do not establish Google indexing or ranking.

## Generated coastal textures — 2026-10-19

- Node: 122/122 checks passed; production Vite build passed.
- Actual Chromium interaction via `tests/coastal-textures.spec.js` passed:
  six generated WebP assets loaded successfully; selected/driven jet ski;
  visited waterfront and bar; changed Low → Medium → Low and
  daylight → sunset → night → daylight; no repeated image requests during
  quality changes; blocked the water image and reloaded to verify a ready,
  playable neutral-texture fallback. No critical page or shader errors.
- Inspected browser screenshots of the coast, sky, water, sunset and night.
  Caught and fixed immutable WebGL texture storage retaining 1px fallback
  colours: releasing that allocation before full-size upload restored the
  generated images. Sky/cloud reflections, surface ripples and timber/ground
  detail are visible in the corrected browser capture.
- Linux Chromium, headless SwiftShader software WebGL, 1100×720 viewport,
  Low pixel ratio .65. A sampled bar frame reported ~10 FPS, 135 draw calls,
  1,684,351 triangles. This is software-renderer test evidence, not a stable
  benchmark or a promise of real-laptop/mobile performance. No new scene
  objects or geometry were added; water adds texture lookups while the photo
  sky skips daytime procedural cloud noise. The added texture payload is
  703 KiB, approximately 17 MiB RGBA GPU storage including mipmaps.
- No real laptop or physical phone was available. Close terrain/vehicles
  remain 3D; generated textures do not establish photorealism or a measured
  reconstruction of Mooloolaba.

## Continuous tender bounce and rear view — 2026-10-19

- 125/125 Node checks and production build passed. Bouncing straight cruise and
  shafting exercised at 30/60/120 Hz; contact splashes stay at hull samples,
  penetration is bounded, releasing power settles the stance, and recovery
  clears contact history. The former always-dry hull assertion was updated for
  brief, bounded stern touches requested by this feature; full mesh clearance
  and immersed prop checks remain, alongside new water-contact assertions.
- Removed flat side-sheet geometry rather than enlarging particle pools. All
  craft retain live falling spray; emissions expire and clear. Existing rear
  plume, sharp-turn conditions and nearby world visibility checks still pass.
- Desktop Chromium driving test passed: tinny straight shaft bounce, repeated
  hull hits, held U rear chase, release, first-person rear, and manual recovery;
  inspected bounce/contact and rear-view screenshots. Landscape touch test
  passed with genuine CDP touchStart/touchEnd on REAR. Initial synthetic pointer
  dispatch was replaced because it cannot establish a browser pointer capture.
- Existing multivehicle sharp-spray browser flow passed for cat, tinny and ski,
  including impact feedback, ordinary ski rear plume, turning and orbiting
  nearby boats/land. No critical page errors in these driving flows.
- Linux Chromium with SwiftShader software WebGL, desktop 1100×720 / 960×640
  and landscape phone emulation 844×390. No physical phone or user laptop was
  available; these checks do not establish a device frame-rate guarantee.

## Shaft-only bounce and contact spray — 2026-10-19

127 Node checks and production build passed. Updated old bounce expectations
for the requested stance-only behaviour: ordinary cruising and turns have no
added bounce, while shafting still bounces at 30/60/120 Hz without phasing
through waves. Tests verify every touching sample is reported, separate
cooldowns, and a bounded rendered splash covers every supplied contact point.
The existing actual Chromium shaft/rear-camera flow passed with a new ordinary
cruising check before LIFT; inspected the contact-spray rear-view capture.
The spray size change is visual (+14%); shared physical trajectories and
particle capacities are retained. Test environment remains software Chromium;
no physical laptop/mobile performance claim.

## Denser touchdown fans — 2026-10-19

128 Node checks, production build and the actual Chromium tinny shaft/rear-view
flow passed. Inspected the revised rear-view spray screenshot. Added a bounded
ballistic plume burst at every supplied hull contact, outward on both sides,
using the same textured packet shader as the jet ski rear plume. Tests check
contact coverage, both sides, descending water and finite expiry. The shared
sprite scale is now 1.45 (45% above the original scale), with unchanged pool
capacities. Core fan packets replace large circular point-mist puffs at contact
splashes; ordinary wave/wipeout landings also use that fan. This spray refinement
was kept separate from the pending northern coastline map changes.

## Separate northern coastline release — 2026-10-19

- 131 Node checks and production build passed with the current spray refinement.
  New checks trace a collision-free coastal route from outside the mouth through
  the full added reach, validate all three safe visit points, test solid land
  versus sea on mapped shore transects and bound the authored headland relief.
  Existing canal/bridge passage, race geometry and vehicle checks still pass.
- Actual Chromium desktop flow passed: selected/driven Seago; visited and drove
  Mooloolaba Beach, Alexandra Headland and Maroochydore Beach through the pause
  menu; checked location labels and recovery; inspected coastal screenshots.
  Landscape phone emulation also selected and visited Alexandra through the
  new menu and retained visible touch driving controls. No critical shader/page
  errors occurred in the desktop flow. A minimap label overlap found visually
  was removed; Alex/Maroochy labels remain, with the Mooloolaba point still marked.
- Extended map matches a byte-for-byte rebuild from the archived OSM extract
  and pre-extension base. Exact source/provenance is included under data/sources.
  North extent grows 2671.7 m, adding 424 footprints, 860 road/path sections,
  19 parks, three beaches and 73 pools. No Google imagery or measured elevations.
- Software-renderer sample in the northern coast: 1100×720, Auto → Low,
  approximately 3.7 FPS at that sampled moment, 97 draw calls and 1,541,499
  triangles. This is headless Linux Chromium/SwiftShader, not real hardware or
  an average benchmark. Low/Auto beachfront facades use repeated atlas quads
  to bound added geometry; frame rates on a real laptop/phone remain unverified.

## Riptide 500 offshore racing-cat release — 2026-10-19

- 138 Node checks pass; production build and `git diff --check` pass. Seven new
  checks exercise 500 km/h acceleration and wave support at 30/60/120 Hz,
  braking/reverse, speed-dependent steering, swept hull collision, clear offshore
  run/recovery, twin-bow tunnel geometry and moving props, bounded falling spray,
  persisted racer choice/trim and high-speed chase/rear camera tracking.
- Actual Chromium browser flow passes: sixth craft selection, offshore launch,
  acceleration to 500 km/h, both planing side fans, rear plume with descending
  packets, braking into reverse, manual recovery, first-person/rear views, pause,
  return to speed-run start, steering, trim and persisted choice/trim on reload.
  Landscape 844×390 phone emulation also selects the sixth craft, uses native
  touch acceleration and recovers. No critical shader/page errors in desktop flow.
- Inspected garage, full-speed chase, rear, cockpit and phone screenshots.
  Fixed crowded selector labels with a two-row grid, removed irrelevant activity
  shortcuts for the racer, and reduced offshore minimap text crowding. Initial
  full-speed chase was obscured by spray: three-quarter placement plus racing
  velocity feed-forward now keeps the model visible and prevents rear view from
  dropping behind it. The strengthened actual desktop flow was rerun and passed.
- Final full-speed sample: Linux headless Chromium with SwiftShader, Low,
  1000×650 viewport, approximately 2.54 FPS at that moment, 45 draw calls,
  1,526,439 triangles, 565 live plume packets and 303 descending packets.
  This is software rendering, not a real laptop benchmark or universal FPS claim.
  Existing particle capacities are unchanged; physical phone performance is untested.
- Offshore play bounds extend east to x=9500 m. Marked run from x=2300 to x=8500
  has a further 1000 m before the boundary. Collision tests check the full lane.
  CPU/GPU exposure and shoreline-colour sampling retain their original mapped
  bounds so the larger playable ocean does not distort canal wave conditions.
- Manufacturer source pages were inaccessible (403); supplied photograph/table
  are user references. Original model/livery; exact engine output unverified.
  The 500 km/h setting is expressly fictional arcade performance. This release
  retains both preceding spray refinements and the separate northern coastline.
