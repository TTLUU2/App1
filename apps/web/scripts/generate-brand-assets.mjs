// One-shot: refresh the three brand assets the app consumes at
// runtime. Reruns are idempotent.
//
//   1. capacitor-assets/icon-only.png  (1024×1024) — iOS home-screen
//      icon. Rendered from PH_Profile Logo.svg (Perry — red circle,
//      white paper plane). Capacitor's asset pipeline slices every
//      iOS variant from this.
//   2. capacitor-assets/splash.png     (2732×2732) — iOS splash.
//      The 2048² Globe.png (teal Earth) centred at ~35% of the frame
//      on the app's navy brand colour (#1a4e6b), so it matches
//      capacitor.config's SplashScreen.backgroundColor and there's no
//      flash at splash-to-app handover.
//   3. apps/web/public/icon.svg        The Perry SVG dropped in
//      verbatim for the web favicon (referenced by
//      apps/web/src/app/layout.tsx metadata.icons).
//
// Runs from the repo root: `node scripts/generate-brand-assets.mjs`.
// Sharp's SVG renderer needs a density hint; 320-400 dpi produces
// clean 1024/950-px output from a 512-viewBox source.

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths are anchored to this script's location so it works whether run
// from the repo root, from apps/web, or via pnpm from anywhere else.
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..'); // apps/web

const SRC_ICON_SVG = resolve(APP_ROOT, 'capacitor-assets/PH_Profile Logo.svg');
const SRC_SPLASH_LOGO = resolve(APP_ROOT, 'public/images/globe.png');
const OUT_ICON = resolve(APP_ROOT, 'capacitor-assets/icon-only.png');
const OUT_SPLASH = resolve(APP_ROOT, 'capacitor-assets/splash.png');
const OUT_WEB_FAVICON = resolve(APP_ROOT, 'public/icon.svg');

// 1. iOS icon — 1024×1024 from the Perry SVG. `density: 400` gives
// sharp a large enough intermediate raster to avoid aliasing on the
// clipPath'd circle edge.
const iconSvg = readFileSync(SRC_ICON_SVG);
await sharp(iconSvg, { density: 400 })
  .resize(1024, 1024, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(OUT_ICON);
console.log('✓ icon-only.png (1024×1024, Perry) written');

// 2. iOS splash — 2732×2732 navy background with the Globe centred at
// ~35% size. `#1a4e6b` matches capacitor.config.ts's
// SplashScreen.backgroundColor so there's no flash at handover.
//
// The source Globe.png has an opaque white background baked in (it
// was authored for use on light card surfaces inside the app). Direct
// composite over navy would show a white square around the globe, so
// we chroma-key: pixels close to pure white get their alpha faded to
// transparent using a soft ramp between brightness 220–255. This
// leaves the globe's edge anti-aliasing intact.
const SPLASH_SIZE = 2732;
const LOGO_SIZE = 950; // ~35% of 2732 canvas — Apple splash sweet spot
const SPLASH_BG = { r: 26, g: 78, b: 107, alpha: 1 }; // #1a4e6b

const globeSized = await sharp(SRC_SPLASH_LOGO)
  .resize(LOGO_SIZE, LOGO_SIZE, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data, info } = globeSized;
// Aggressive chroma key: any pixel where ALL three channels are near-
// white gets zeroed. Faded ramp between 195–235 preserves the
// anti-aliased sphere edge so it blends cleanly into navy. Pure
// brightness (min-of-RGB) is a better background test than average —
// it correctly ignores light-teal pixels that live on the sphere.
const RAMP_LOW = 195;
const RAMP_HIGH = 235;
const RAMP_WIDTH = RAMP_HIGH - RAMP_LOW;
for (let i = 0; i < data.length; i += 4) {
  const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
  if (minChannel >= RAMP_HIGH) {
    data[i + 3] = 0;
  } else if (minChannel > RAMP_LOW) {
    const t = (minChannel - RAMP_LOW) / RAMP_WIDTH;
    data[i + 3] = Math.round(data[i + 3] * (1 - t));
  }
}

const transparentGlobe = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

await sharp({
  create: {
    width: SPLASH_SIZE,
    height: SPLASH_SIZE,
    channels: 4,
    background: SPLASH_BG,
  },
})
  .composite([{ input: transparentGlobe, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(OUT_SPLASH);
console.log('✓ splash.png (2732×2732, Globe chroma-keyed on navy) written');

// 3. Web favicon — Perry SVG dropped in verbatim.
writeFileSync(OUT_WEB_FAVICON, iconSvg);
console.log('✓ public/icon.svg written (Perry SVG)');
