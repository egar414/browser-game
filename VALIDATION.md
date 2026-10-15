# Validation record

Current pump, trim and spray update: 15 October 2026.

Environment: Node.js 24.19.0, npm 11.9.0 and Chromium 154 on Linux, with an
AMD EPYC virtual CPU (5 reported CPUs). WebGL uses SwiftShader software
rendering, not a hardware GPU. These checks do not establish laptop frame rates
or a human judgement of handling realism.

## Current executed checks

- **25 Node simulation/spray tests passed.** Coverage includes distinct craft
  acceleration, braking/reverse, powered steering, four-point shared-wave
  buoyancy, wheelie scoring and over-trim wipeout, ramps for both craft, landed
  360 scoring, rough landings, collisions, clear bridge/race routes, recovery,
  boundaries, activities, exploit prevention and corrupt storage.
- Added energy/momentum checks for jet thrust and propeller power; trim versus
  hull attitude; stationary pumping under power; immediate loss of liquid
  thrust with exposed intake; gradual re-immersion; reversed discharge;
  submerged wash; mode power differences; latched trim/clamping; dry chine
  suppression; gravity/drag; frame-rate emission stability; pool bounds and
  effect cleanup. Shift alone no longer multiplies a physically identical
  spray state.
- **6 Playwright browser flows passed against the frozen production build.**
  Actual keyboard input drove both craft, including powered sliding turns,
  outside spray/wakes, braking, reverse and recovery. Other checks covered
  Low/Medium/High rendering and reflections, wheelie scoring, pause/camera,
  mute, controls, focus loss, resizing, preferences, race start/restart,
  trick sessions and return to free roam. The new flow checks T mode cycling,
  extended trim above 12 game degrees, releasing Q without losing trim,
  reloading its saved value, mode-dependent limits and decreasing trim.
- Production build succeeded. No runtime CDN, accounts or API keys are needed;
  all dependencies and procedural assets are bundled.
- High-quality water/reflection, new HUD, full-race finish and powered-turn
  screenshots for both craft were visually inspected. A local production
  smoke check also verified mode cycling, latched trim and powered spray for
  both craft, without page runtime errors or failed requests.

The separate keyboard-only acceptance driver completed all 12 race gates in
**125.58 simulated seconds**, with no page runtime errors, and successfully
restarted the race. It ran against the frozen production build at 800×500 Low.
Logged software-rendered FPS samples ranged approximately from 8 to 16; the
finish sample was 8.6 FPS. These are workload observations, not a GPU benchmark.
Public deployment succeeded in Actions run **38681097961**, application commit
`bd9327b19354a463c14258f1aa6e34acf0bac1c6`. The public HTTPS page with
`?v=bd9327b` returned 200. Chromium drove both craft through broad powered turns,
cycled into Freestyle and adjusted/latched trim. Both produced pump flow,
particles and stronger outside spray. No page runtime errors or failed network
requests occurred. Hosted screenshots of both turns were visually inspected.
The 960×640 Low software-rendered samples were 6.7 FPS (ski) and 7.9 FPS (cat).
Certificate verification stayed enabled; broader filesystem access let Chromium
read its existing trusted certificate database.

## Physical realism and research limits

See [RESEARCH.md](RESEARCH.md) for inspected OpenStax sources, implemented
relations, tuning and approximations. This is not a calibrated production
watercraft simulation. Manufacturer pages were blocked by the proxy; factory
trim angles, measured pump curves and hull resistance were not obtained.
Ventilation is approximated; vapor cavitation and full fluid dynamics are not
simulated. Buoyancy, powered wheelie assistance, yaw, ramps and aerial control
retain game approximations. A reverse bucket is approximated in force/wash
without animated bucket geometry.

A human has not driven a complete test lap. Ramps/spins/landings and long trick
session expiry have simulation coverage, rather than a human browser
play-through. Chromium was tested; Firefox, Safari, mobile/touch and hardware
GPU performance were not tested. Software-browser screenshots can verify
appearance and operation, not subjective real-world handling accuracy.

## Earlier graphics deployment

The prior graphics update was published as commit
`18acdc1a3b5ff30f9b0b4eeaf00142967d4a32ff`, Actions run `38675522389`.
Its public HTTPS page and both craft were tested with certificate verification
enabled. The initial version's complete keyboard race took 121.83 simulated
seconds. Those earlier results are historical and do not substitute for the
current changed-propulsion acceptance drive.

Previous graphics performance at 800×500 Low was a 9.3 FPS mean across six
software-rendered cruise/turn samples. That workload is not a benchmark of an
ordinary laptop, and the current update does not promise universal 60 FPS.
Auto quality reduces rendering detail after sustained low frame rates.

The supplied SumbaSurf reference at https://wavedash.com/games/sumbasurf remains
blocked by the cloud proxy. It has not been visually inspected; no visual-parity
claim is made.
