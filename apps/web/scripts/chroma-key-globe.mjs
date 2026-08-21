// One-off: strip the white background + soft vignette from
// /public/images/globe.png so JourneyProgress can render it on any
// surface (Lacquer brick, paper, dark mode later) without any halo.
//
// Two combined passes over the raw pixel buffer:
//
//   1. Geometric circular mask — anything outside a radius of
//      ~0.44 * canvasWidth from the centre goes fully transparent.
//      The source globe sphere occupies ~85% of the canvas, so this
//      wipes the drop shadow + vignette + margin whitespace without
//      touching the sphere.
//
//   2. Chroma-key ramp — inside the mask, near-white pixels
//      (min-channel ≥ 235) go transparent; a soft 170→235 ramp
//      preserves the sphere's anti-aliased ocean/land edges.
//
// Idempotent: rerunning is a no-op for already-processed pixels.
// Overwrites the PNG in place.
//
// Run once with:  node apps/web/scripts/chroma-key-globe.mjs

import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..'); // apps/web
const GLOBE = resolve(APP_ROOT, 'public/images/globe.png');

const raw = await sharp(GLOBE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;

// Geometric circle: sphere sits roughly centred; 0.44 * width radius
// clears the drop shadow + vignette but leaves the sphere edge
// intact (sphere spans ~0.42 * width in the source PNG).
const cx = info.width / 2;
const cy = info.height / 2;
const rSphere = Math.min(cx, cy) * 0.44;
const rSphereSq = rSphere * rSphere;
// Soft edge on the geometric mask so we don't produce a hard circle
// against darker surfaces — 6px feather.
const rFadeIn = rSphere - 3;
const rFadeOut = rSphere + 3;

const RAMP_LOW = 170;
const RAMP_HIGH = 235;
const RAMP_WIDTH = RAMP_HIGH - RAMP_LOW;

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;

    // Outside the sphere circle → fully transparent (feathered edge).
    if (distSq > rSphereSq) {
      if (distSq > rFadeOut * rFadeOut) {
        data[i + 3] = 0;
        continue;
      }
      // In the fade band, reduce alpha linearly.
      const dist = Math.sqrt(distSq);
      const t = (dist - rFadeIn) / (rFadeOut - rFadeIn);
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      continue;
    }

    // Inside the sphere: chroma-key the near-white pixels so the
    // ocean's lightest tones stay visible but pure background whites
    // drop to transparent (belt-and-suspenders with the geometric
    // mask above).
    const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
    if (minChannel >= RAMP_HIGH) {
      data[i + 3] = 0;
    } else if (minChannel > RAMP_LOW) {
      const t = (minChannel - RAMP_LOW) / RAMP_WIDTH;
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
    }
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile(GLOBE);

console.log(`✓ globe.png (${info.width}×${info.height}) chroma-keyed + circle-masked`);
