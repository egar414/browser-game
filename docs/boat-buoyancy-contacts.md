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
The shared spray visual scale is 3.125; the restored jet-ski rear plume retains
its previous 2.5 appearance. Tinny droplets and hull-contact packets are a
further 18% larger, and their hull-normal launch spread is 25% wider. Pools,
packet caps, gravity and the near-camera coverage limit remain bounded.

Moving tinnies also peel water from all currently wetted hull intersections at
most once every 0.18 s. Dry bow sections and stationary hulls do not emit this
wash. It uses the contact pool, with no repeating impact sound or extra impact
counter. Receivers infer the same wash from the received pose, without SQL.

Established shafting keeps the hull above the water while the outboard remains
immersed. Sustained throttle above 72% builds strain over several seconds;
feathering clears it. The meter says EASE THROTTLE before the bow falls off the
balance point. Intentional trim-up loops remain available. Recovery resets
strain and wash cooldowns. Extreme spray-turn capsize and manual righting are
documented in `capsize-and-righting.md`.

Validation includes load/crew effects, all-fleet wave support, actual hull-bound
spray origins, stern-only shaft impacts, first-contact landings, outward ballistic
plumes, fixed budgets, existing speed/trick/flooding checks and browser driving,
resting-angle, natural-wave, shafting and online rendering flows. The browser
runner uses Chromium/SwiftShader; geometry/packet budgets are not laptop FPS
measurements.
