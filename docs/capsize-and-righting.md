# Capsize, overboard riders and manual righting

Tinnies, jet skis and Thundercats build a visible capsize-risk meter during a
sustained full-lock, powered freestyle spray turn. The trigger requires real
headway, a wetted drive, hull slip and turning load. Brief inputs, controlled
steering, straight running and stationary controls do not throw the rider.
Easing power, releasing the freestyle stance or straightening the bars clears
the accumulated risk. The risk model is bounded gameplay assistance, not a
manufacturer stability rating.

`vehicles/capsize.js` owns the persistent overturned state. The engine stops,
the craft sheds its remaining momentum, and its rider follows a bounded
ballistic ejection before floating on the wave surface. Shoreline collisions
are checked for the drifting craft and ejected character. Tinny over-trim
loops complete their backward rotation and then roll upside down into the same
state. Capsizes stay in place rather than automatically respawning.

After the initial overturn settles, hold R (or the on-screen hold button) for
2.4 seconds to roll upright and return aboard. Releasing stops the recovery
and drains its progress. Propulsion is blocked until righting finishes. Normal
recovery remains available outside this state. A recovery camera frames both
the floating rider and boat, then restores the selected view after righting.

`CapsizeView` hides the attached driver/NPC passenger and creates overboard
actors only when needed. Actors own their geometry and material clones; shared
fleet wardrobe textures/materials must not be disposed when a peer leaves.
Actors float face-up and are hidden again when the craft is righted.

Existing online roll/pitch fields convey the overturned hull, so this change
does not require a SQL migration. Receivers infer an overboard actor from the
upturned pose. Exact local ejection coordinates are not sent; remote floating
positions are a visual approximation beside the boat. Pitch interpolation
takes the short angular path when a completed loop returns to zero after
righting. Boarding/towing roles end when the driver overturns.

Established tinny shafts now constrain the visible hull above the wave surface
with about 12 cm sample clearance, while the outboard remains immersed. The
same constraint is used by physics and render interpolation. During a dry,
high shaft, hull-contact spray is suppressed; normal wave landings and wetted
hull spray resume as the hull comes back down. Existing throttle feathering and
intentional trim-up loops remain available.

Validation includes actual visible hull vertices and wet propellers on all
four tinnies, loops on each tinny, capsize/righting across 30/60/120 Hz on every
small-craft family, non-extreme controls, idle behavior, ejection, resource
ownership, recovery camera framing, online poses and crew/tow eligibility.
Browser flows exercise real full-speed spray inputs, risk warning, overboard
actors, persistent capsize, partial/released/complete righting, in-place return,
the uploaded Tender model, and an overturned peer through the existing backend.
