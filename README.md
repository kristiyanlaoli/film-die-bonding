# Die Attach Film (DAF) Simulator v1.0

A standalone Next.js / React Three Fiber educational simulator adapted from Paste Adhesive Simulator v1.6. English is the initial language; built-in SVG flags switch to Bahasa Indonesia or Traditional Chinese (Taiwan), without resetting simulation parameters or event history.

## Run and deploy

Requires Node.js 20+ and npm. Run `npm install`, then `npm run dev` and open http://localhost:3000. Use `npm run build` to check the production build locally. To deploy, extract this archive into a new GitHub repository (put package.json at its root), import the repository in Vercel, and choose the Next.js framework preset. No API key, database, environment variable or external model asset is required.

## Workflow

1. Wafer thinning: schematic backgrinding of a nine-die wafer coupon.
2. DAF lamination: a preformed adhesive film is applied to the backside with heat and pressure; the film is distinct from the removable dicing tape.
3. Dicing: four saw traces separate the coupon into nine equal dies, each retaining a film piece.
4. Pick-up: the ejector pins rise below the tape while the collet descends. The die and film lift together; the tape stays behind.
5. Optical alignment: the head moves to the clean substrate.
6. Heated die attachment: film contacts the pad and compresses slightly with the accelerated heat/force/dwell representation.
7. Thermal curing: representative thermosetting film example.
8. Inspection: modeled PASS/FAIL, localized failure reasons, film thickness, contact, compression, offset, tilt and voids. Wire bonding / backend assembly is indicated as the next process, not simulated.

Use the stage controls, playback/scrubbing, speed controls, camera views, transparent view and post-attachment section view. The desktop viewport takes the remaining space; optional engineering and event panels open on demand. Mobile uses a responsive one-column layout with horizontally scrollable presets.

## Educational limitations

The geometry is schematic and uses exaggerated thicknesses, a rectangular wafer coupon instead of a complete wafer, and an illustrative release mechanism. The film is not a fluid; there is no paste dispense, paste volume or fillet model. No FEA, CFD, validated material data, or actual sensor readings are used. The numerical limits and process recipes are teaching assumptions. Production settings must come from the specific DAF material and qualified equipment process.

## Checks performed

TypeScript/TSX syntax transpilation; strict compilation of the standalone simulation and layout modules; all six presets across three locales; all 441 die width/length grid combinations from 2–7 mm. Full Next.js build and browser/WebGL rendering are not verified in the authoring environment (project dependencies not installed).
