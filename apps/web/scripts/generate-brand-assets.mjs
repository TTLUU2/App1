// One-shot: refresh the three brand assets the app consumes at
// runtime. Reruns are idempotent.
//
//   1. capacitor-assets/icon-only.png  (1024×1024) — iOS home-screen
//      icon. Rendered from PH_Icon_Full.svg (full-bleed red + white
//      paper plane, no circular clip). Capacitor's asset pipeline
//      slices every iOS variant from this. Full-bleed matters: iOS
//      applies its own rounded-corner mask, so any transparent or
//      white padding around a smaller shape shows as a halo on the
//      home screen. Red-to-red trim eliminates that halo.
//   2. capacitor-assets/splash.png     (2732×2732) — iOS splash.
//      Same visual as the icon, scaled up so the splash reads as
//      "the app icon expanded to full screen" — one system.
//   3. apps/web/public/icon.svg        Same SVG dropped in verbatim
//      for the web favicon (referenced by
//      apps/web/src/app/layout.tsx metadata.icons).
//
// Runs from anywhere: `node apps/web/scripts/generate-brand-assets.mjs`.
// Sharp's SVG renderer needs a density hint; 400 dpi produces clean
// 1024/2732-px output from a 512-viewBox source.

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths are anchored to this script's location so it works whether run
// from the repo root, from apps/web, or via pnpm from anywhere else.
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..'); // apps/web

const SRC_ICON_SVG = resolve(APP_ROOT, 'capacitor-assets/PH_Icon_Full.svg');
const OUT_ICON = resolve(APP_ROOT, 'capacitor-assets/icon-only.png');
const OUT_SPLASH = resolve(APP_ROOT, 'capacitor-assets/splash.png');
const OUT_WEB_FAVICON = resolve(APP_ROOT, 'public/icon.svg');

const iconSvg = readFileSync(SRC_ICON_SVG);

// 1. iOS icon — 1024×1024 from the full-bleed SVG. `density: 400`
// gives sharp a large enough intermediate raster to avoid aliasing.
await sharp(iconSvg, { density: 400 })
  .resize(1024, 1024, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(OUT_ICON);
console.log('✓ icon-only.png (1024×1024, full-bleed red + plane) written');

// 2. iOS splash — 2732×2732, same design. `density: 1200` because
// scaling a 512-viewBox SVG to 2732px needs a much higher rasterization
// density to stay sharp. `fit: cover` guarantees red-to-edge on any
// aspect ratio the launch screen might crop to.
await sharp(iconSvg, { density: 1200 })
  .resize(2732, 2732, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(OUT_SPLASH);
console.log('✓ splash.png (2732×2732, matches icon) written');

// 3. Web favicon — SVG dropped in verbatim.
writeFileSync(OUT_WEB_FAVICON, iconSvg);
console.log('✓ public/icon.svg written (full-bleed SVG)');
