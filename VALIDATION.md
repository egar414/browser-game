# Validation record

Validated in this cloud environment using Node.js 24.19.0, npm 11.9.0, and
Chromium 154.0.8037.57 on Linux with an AMD EPYC virtual CPU (5 reported CPUs).
The browser used SwiftShader software WebGL, not a hardware GPU.

## Executed checks

**18 physics/spray integration tests and 5 browser tests passed for the graphics upgrade.**

- Production bundle generated successfully with Vite. It is fully self-contained;
  dependencies are bundled and there are no runtime CDN, account, or API calls.
- Physics/integration tests cover acceleration, braking, reverse, distinct craft
  tuning, powered/coasting steering, inertia, idle scoring, shared wave buoyancy,
  bow lifts, over-trim wipeouts, both craft launching from ramps and landing,
  a complete 360 spin banked on landing, rough landings, land collisions, bridge
  passages, navigable race segments, nearby recovery, world limits, race completion
  and restart, timed challenge expiry, repeated-trick farming prevention, and
  damaged/unavailable local storage.
- Five Playwright browser flows exercised actual keyboard input: both craft
  selection and driving, acceleration, spray generation, powered sliding turns,
  braking/reverse, recovery, jet ski wheelie scoring, cameras, pause/resume,
  quality and mute controls, persisted vehicle/colour, controls guide, resize,
  focus loss, race start/restart, challenge start and return to free roam. New
  assertions check outside-turn spray strength, persistent wake generation and
  recovery clearing the old effects. Low, Medium and High render without shader
  or runtime errors, including repeated changes to reflection settings.
- Spray tests cover stationary/airborne/wipeout suppression, mirrored ejection
  points, actual turn and slip response, stronger freestyle carving, reduced
  reverse jetting, frame-rate stability, finite bounded geometry, foam expiry,
  landing effects, recovery clearing, and disposal of all effect objects.
- The separate end-to-end acceptance driver completed all 12 race gates using
  only keyboard controls against the production build, and restarted the race.
  Lap: **121.83 seconds** of simulated race time. No page runtime errors. This
  complete race was run before the graphics upgrade; the vehicle movement,
  collision system and route are unchanged. The current browser suite checks
  race start/restart and activity switching; it does not repeat the full lap.
- Menu and driving screenshots were visually inspected, including the original
  twin-pontoon model, outboard marking, HUD, waterways, marina, and foam trails.
- Frozen installation is exercised with `npm ci`, preserving package-lock.json.

## Performance observations

The initial keyboard-driven complete race at an 800×500 viewport and Low quality
measured approximately **10–17 FPS** on software rendering. The graphics upgrade
was measured separately at 800×500 Low during a cruise followed by a spray turn:
six samples were **9.2, 7.5, 9.4, 9.1, 9.4 and 11.2 FPS**, a **9.3 FPS** mean.
These are different workloads and do not establish a comparative speedup. This is a correctness-testing
environment, not representative evidence for 60 FPS on a recent laptop. Higher
quality uses a denser water surface and optional shadows. Auto starts from CPU
and viewport information, then reduces quality after sustained slow gameplay.
Actual performance and subjective handling feel require hardware-browser testing.

## Limits of these checks

- A full race has not been driven by a human tester.
- Ramp launch, complete spin, landing/wipeout, and long challenge expiry have
  integration coverage, not a full human browser play-through.
- Chromium is tested; Firefox, Safari, touch input, and hardware-GPU performance
  have not been tested.
- Public GitHub Pages deployment succeeded (Actions run 38672474416, attempt 3).
  https://egar414.github.io/browser-game/ returned HTTP 200. Chromium opened the
  hosted page over verified HTTPS and drove both vehicles with keyboard throttle,
  steering and freestyle inputs. Both generated spray; no page runtime errors
  or failed network requests were observed. The cloud filesystem sandbox needed
  broader access for Chromium to read its existing trusted certificate database;
  certificate verification remained enabled throughout.
- SumbaSurf's supplied Wavedash URL was blocked by the proxy (CONNECT 403).
  `wavedash.com` was added to the saved network draft; runtime access still
  requires applying that configuration. The reference has not been visually
  inspected and no visual-parity claim is made.
