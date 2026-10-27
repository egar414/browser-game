# Resting trim and wave contact

The tinny family uses approximate load masses in `tinny-loading.js`. Pitch is
derived from the aft moment of hull, motor, driver and passenger relative to
the hull's waterplane restoring moment. Lateral weight produces a bounded lean.
These are gameplay estimates, not manufacturer specifications or load ratings.
The 2 m / 50 hp dinghy has substantially more resting trim than the longer hulls.
Passenger movement affects the balance, and static trim fades with speed and
the existing aft riding stance. The Wasp retains its 8 cm idle lift.

`hull-support.js` samples the actual curved model profiles at nine stations
per hull or pontoon, including the middle of the hull. Cached transforms and
wave samples are shared between impact detection and support correction.
Normal cruising, raised-bow riding and interpolated rendering use the support
constraint. Open gunwales retain freeboard; sealed PWCs can immerse their aft
quarters enough to retain the intake during a high bow ride. Deliberate sinking
bypasses render support. The existing analytic CPU/GPU wave field is unchanged.

Touchdown is detected at the hull surface instead of waiting for the body origin
to enter the water. Moving crests can transfer a bounded upward velocity.
Short natural wave hops score from 0.25 s of airtime; ramp tricks retain their
0.45 s threshold. Feather-light wave landings avoid the old automatic 5% loss.

Impact spray uses intersections between the water and the real hull sections.
It launches upward/outward using the hull normal, including wet stern quarters
while shafting. Up to twelve origins are retained per event, with separate
contact cooldowns and a 0.1 s global interval. Contact plume bursts use at most
5% of their existing pool, capped at 96 packets. Airborne/recovered craft reset
contact history to avoid stale splashes. Remote and local NPC visuals infer
contacts from their rendered poses without a new network payload or SQL change.
The shared spray visual scale increases from 2.0 to 2.2 without larger pools.

Validation includes load/crew effects, all-fleet wave support, actual hull-bound
spray origins, stern-only shaft impacts, first-contact landings, outward ballistic
plumes, fixed budgets, existing speed/trick/flooding checks and browser driving,
resting-angle, natural-wave, shafting and online rendering flows. The browser
runner uses Chromium/SwiftShader; geometry/packet budgets are not laptop FPS
measurements.
