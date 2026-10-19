# Jet ski model references

Checked 19 October 2026. Blender is not required to supply model files or refine
this game's existing procedural craft.

## Verified references

- [Official Spark / Trixx product page](https://sea-doo.brp.com/au/en/models/personal-watercrafts/rec-lite/spark-x-trixx.html).
  The older Trixx link redirects here. This presents the **2027 Spark X Trixx**;
  do not mistake it for the older generation in the user's blue-ski photograph.
- [2026 Spark Trixx side image](https://sea-doo.brp.com/content/dam/global/en/sea-doo/my26/studio/rec-lite/spark-trixx/SEA-MY26-SPARK-Trixx-1up-NoSS-M90-Gulfstream-Blue-Orange-Crush-00067TB00-Studio-RSIDE-CU.png).
  Included in the manufacturer's page, fetched successfully and visually inspected.

These are reference images, not licensed game meshes/textures. They were not
added to shipped assets. The supplied blue-ski photo remains the main reference
until its model year is established.

## Downloadable models

No detailed, licensed Spark Trixx download was verified. Sketchfab's catalogue
API is blocked by this environment (403, including after an approved elevated
retry). Accessible GitHub searches did not identify a suitable replacement.

[Search downloadable models on Sketchfab](https://sketchfab.com/search?type=models&q=sea%20doo%20spark&features=downloadable)
is a search link, **not a verified asset recommendation**. A candidate model ZIP
containing GLB/glTF, textures and the licence can be inspected locally without
Blender. A listing screenshot with the licence, formats and polygon count helps
before buying anything.

A useful starting target for a laptop player craft is roughly 15,000–40,000
triangles and sensible 1K/2K textures; test actual performance in the game.
Verify modification/redistribution rights, avoid baked-in logos in the original
game designs, and retain separate handlebars, steering nozzle, reverse bucket
and rider attachments for animation.


## Compact Sparkplug rebuild

The supplied blue/black ski is the primary visual reference. The official side
image above provides a second proportion check; the result is an original
approximation, not an exact manufacturer replica. Four rendered views (front,
side, top and rear) were compared with the previous craft and reference images.

The rebuild adds a closed multi-chine hull, angular split fairings, open low
footwells, a contoured vinyl saddle with a tiny procedural weave, raised bars,
hand guards, levers/cables, a ribbed rear deck and a compact pump/reverse gate.
Each rigid assembly is batched by material; steering, trim, reverse and rider IK
remain separate. The existing propulsion and physics tuning is retained.

A neutral studio review without the rider measured 12,582 triangles / 20 draw
calls, against 17,190 triangles / 15 calls for the previous model (about 27%
fewer triangles, five more calls). The complete new craft including rider is
19,206 triangles / 40 meshes. These are model costs, not frame-rate promises.
The old 530 KB GLB and its loader are no longer requested or bundled. Original
geometry and procedural materials are generated locally; no manufacturer image
or third-party mesh is shipped. Width/length and attachment locations live in
`src/vehicles/spark-model.js`; handling stays in `src/config.js`.

Validation: the Node suite passed 157 checks. A Chromium driving flow exercised
launch, acceleration, steering, extended trim/bow ride, reverse, recovery,
close/first-person/rear cameras, and verified no GLB request or page error.
Screenshots were visually inspected. This runner uses Linux Chromium with
SwiftShader software rendering at Low quality; it is not a laptop GPU benchmark.
The rebuild targets Sparkplug only; Seago and Apex retain their existing models.
