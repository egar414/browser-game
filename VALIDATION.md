# Validation record

Mooloolaba-inspired setting and manufacturer-researched handling update,
15 October 2026.

Environment: Node.js 24.19.0, npm 11.9.0 and Chromium 154 on Linux, with an
AMD EPYC virtual CPU (5 reported CPUs). WebGL uses SwiftShader software
rendering, not a hardware GPU. These checks do not establish laptop frame rates
or a human judgement of handling realism.

## Current checks

- **32 Node simulation/spray tests passed.** Existing coverage includes distinct
  craft acceleration, braking/reverse, powered/coasting steering, shared-wave
  buoyancy, wheelies, over-trim wipeout, both craft launching from ramps, landed
  360 scoring, rough landings, collisions, bridge/race clearance, recovery,
  boundaries, activities, exploit prevention and corrupt storage.
- New checks verify nine selectable/latched trim positions, the physical trim
  actuator waiting for forward thrust, inlet momentum in all three axes,
  Freestyle brake-gate response, neutral-to-reverse behaviour without threshold
  oscillation, a powered Thundercat bow ride and release, and its transom deck
  remaining above the sampled water while bow riding. A final source-driven
  correction preserves lateral jet deflection through the reverse bucket while
  a reversing propeller reverses its lateral component; that distinction also
  has an explicit passing simulation test. Earlier pump energy,
  momentum, propeller power, intake ventilation, underwater wash, droplet drag,
  finite geometry and effect cleanup checks also pass.
- **Seven browser flows passed.** Actual keyboard input
  drove both craft through spray turns, braking, reverse and recovery. Other
  checks covered Low/Medium/High rendering and reflections, jet-ski wheelie
  scoring, pause/camera, mute, controls, focus loss, resizing, saved preferences,
  nine-position trim, modes and activities. The new Thundercat flow raised trim,
  accelerated into a bow ride without a jump key, banked its score and settled
  the bow by releasing the weight-shift input. The home screen identifies
  Mooloolaba. The rerun after the stern-support correction passed all seven flows. Both
  affected craft-driving flows were repeated and passed after the final
  reverse-bucket steering correction.
- The final keyboard-only acceptance driver completed all 12 race gates and
  restarted successfully in **142.82 simulated seconds**, with no page runtime
  errors, against the frozen production build. It used an 800×500 Low viewport.
  Logged software-rendered FPS samples were approximately 7–15, with 8.3 FPS
  at the finish. These are CPU-rendering observations, not a laptop benchmark.
- Production build succeeded. Dependencies and original procedural assets are
  bundled; there are no runtime CDN, account or API key requirements.
- Water/reflections, HUD, revised rider, initial Thundercat bow ride and map were
  visually inspected. The bow-ride inspection exposed excessive stern sinking;
  this was fixed with a stern-support height adjustment and an explicit waterline
  test. The corrected bow-ride image was visually inspected after the final browser
  run: the boat rises around the stern and its driver remains attached to the
  tiller/foot positions.

Public deployment and hosted verification of this update: pending.

## Research and realism limits

The official **2026 Spark Series guide** and **Yamaha trim guidance** were read,
including nine-position VTS, nozzle steering under power, brake/reverse,
Trixx-mode differences, planing, wetted hull and spray location. See
[RESEARCH.md](RESEARCH.md) for direct source links, printed page references,
equations, implementation decisions and approximations. The default Sea-Doo
product page now describes a different 2027 model; it was not confused with the
2026 90 hp reference.

There are no measured pump curves, hull resistance curves, inertia tensors or
factory nozzle angle calibrations. Low-RPM inlet admission, buoyancy, angular
spring/damping, planing, stern support, wheelie assistance, sliding and aerial
control remain reduced-order game approximations. Thundercat bow riding has
explicit gameplay assistance. Vapor cavitation, full fluid dynamics, complete
six-degree rigid-body torques and wake buoyancy are not simulated.

The setting is **Mooloolaba-inspired**, with a wharf/spit interpretation, connected
Minyama/Kawana canal areas and a modern Point Cartwright-inspired lighthouse.
Routes, distances and orientation are compressed/rearranged. OpenStreetMap and
Sunshine Coast Council pages were blocked by the proxy; their domains were
added to the pending network draft. It is not a verified recreation or a
navigation map. No third-party geographic tiles or copyrighted manufacturer
assets are shipped.

A human has not driven a complete acceptance lap. Browser automation uses the
normal keyboard controls; visual inspection does not establish subjective
real-world handling accuracy. Ramp/spin/landing edge cases have simulation
coverage rather than a human browser play-through. Chromium was tested;
Firefox, Safari, mobile/touch and hardware GPU performance were not tested.
Sound is synthesized, with different engine firing cadence/harmonics and noise
splash envelopes; it has not been compared by ear with recordings of real craft.

## Performance and earlier releases

The prior trim release was published as application commit
`bd9327b19354a463c14258f1aa6e34acf0bac1c6`, Actions run `38681097961`, and verified
on the public HTTPS site with both craft. Its 960×640 Low software-rendered
samples were 6.7 and 7.9 FPS. The initial game race took 121.83 simulated seconds;
the prior trim release race took 125.58. These are historical workloads and do
not substitute for the current changed-handling checks or imply a performance
comparison. Auto quality reduces detail after sustained low frame rates.

The supplied SumbaSurf reference at https://wavedash.com/games/sumbasurf remains
blocked. It has not been visually inspected; no visual-parity claim is made.
