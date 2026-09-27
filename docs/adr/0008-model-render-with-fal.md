# Model render: fal image, then fal 3D, cached per combination

## Status

accepted

## Decision

A Model render is generated on **fal** in two steps: a studio image of the
brand, model, year, and color (the 2D poster), then image-to-3D (GLB).
Both are stored in the public `vehicle-renders` bucket keyed by brand,
model, year, and color, so each combination is generated once. Generation
is asynchronous (fal queue + webhook); the Vehicle shows a body-type
silhouette until the poster exists, and the poster until the GLB exists.

The webhook is the fast path, not the only one. While a render is
generating, the app calls `vehicle-render` every 20 seconds; after 20
seconds without a webhook it asks fal's queue for the job and finishes the
step itself, and after 20 minutes it gives up and marks the step failed. A
status check-and-set keeps the two paths from both submitting the 3D job.
The 3D step gets fal's own URL for the poster, not our Storage URL. Without
this, a local stack (which fal cannot reach) or one lost webhook left a
render "generating" forever.

The live 3D canvas appears only in the main hero (Vehicle detail and the
active Vehicle on Home), lazy-loaded. Lists and cards use the 2D poster.

## Considered options

- **Imagin.studio renders as the 3D input** — not chosen: the team uses fal
  only.
- **3D in every card** — rejected: several WebGL contexts per screen drain
  battery and hit iOS Safari's context limit.
- **Procedural three.js car (v1)** — replaced: it could not look like the
  user's model.

## Consequences

- A generated render may miss details of the real model; it is an
  illustration, and the UI never calls it a photo.
- three.js stays in the bundle but only in the hero's chunk.
