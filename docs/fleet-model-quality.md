# Fleet model construction

The 310 Wasp remains the quality reference. Its hull proportions are unchanged.
`restLift: .08` adds 8 cm of actual buoyant support at idle; the lift fades below
4 m/s and when shifting aft. Its planing ride height, motor mount, propeller,
speed class and controls retain their existing tuning. Remote players receive
the resulting ordinary pose; no database migration is required.

The older fleet now uses original Three.js geometry with curved station lofts,
solid transoms and plate rims, shaped seating, detailed outboards and batched
hardware. Each vessel keeps its own silhouette, colour scheme and craft ID.
The already detailed photo-based Spark hull remains in use.

- `marine-hull.js`: monotone station interpolation, separate chine panels,
  inner/outer hull skins, closed deck variants, interior ribs and curved saddles.
- `marine-details.js`: brushed alloy, gelcoat, original shared teak textures,
  rounded fittings and appropriately sized cleats.
- `tender.js`: 225 Tender, Dinghy Derby and Super Skua share construction methods
  while retaining their own dimensions and trim.
- `angler-outboard.js`: detailed powerhead, mounting clamps, tiller, shaft and
  separate cupped propeller. The larger powerhead suits the 50 hp variants.
- `models.js`, `apex-model.js`, `racing-cat.js`, `dive-boats.js`,
  `offshore-view.js`, and `surf/yacht.js` apply these methods to their own parts.

The ocean stencil profiles use the same curved station interpolation. Keep
their section dimensions, chine ratios and sportfisher length mapping aligned
with any future geometry changes. Catamarans retain separate pontoon volumes.
Intentional flooding meshes continue to render independently of ocean exclusion.

## Budgets and review

`art/fleet-review.html` renders the actual factory models from orbit, side,
bow/stern and interior views. It is a development review page, not a mockup.
The automated review captures thirteen craft in three views and checks a
36,000-triangle / 40-draw visible rigid-model ceiling. Full player craft including
riders are checked against the Wasp class budget of 48,000 triangles / 54 draws.

The lighter instanced mooring variant has approximately 12,950 triangles versus
12,670 for the previous tender, while the playable tender has approximately
18,600 without its riders. Rigid assemblies batch by material; rider IK,
handlebars, motors and propellers remain independently animated. These are
geometry budgets, not measured laptop frame rates.

Validation covers finite geometry/normals, symmetric bounded hulls, separate
seating, propeller/motor attachments, idle buoyancy, existing shafting/speed
behaviour, online Wasp rendering and Thundercat WOMP, fleet camera/quality changes,
GPU water exclusion, and deliberate flooding/sinking. Browser screenshots are
visually reviewed. The cloud runner uses Chromium/SwiftShader.
