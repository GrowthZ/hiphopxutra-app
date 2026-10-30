#!/usr/bin/env bun
/// <reference types="bun" />
// Turns the local sample photos in public/image/*.png (half-body cut-outs, 3:4) into what the app stores for a
// dancer: a WebP half-body and a square WebP avatar cropped around the face, plus a manifest that
// `bun run db seed ... --dev` uses to give the sample dancers photos. Everything stays in public/image/, which is
// gitignored: these are photos of real minors (rules.md), for local testing only.
//
//   bun scripts/sample-photos.ts [--female IMG_1,IMG_2 ...]   (photos default to BBOY; list the BGIRL ones)

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC = path.join(ROOT, 'public', 'image');
const OUT = path.join(SRC, 'seed');
export const SAMPLE_PHOTO_MANIFEST = path.join(OUT, 'manifest.json');

const arg = process.argv.indexOf('--female');
const female = new Set(arg > 0 ? process.argv[arg + 1].split(',').map((s) => s.trim().replace(/\.png$/i, '')) : []);

const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)) : [];
if (files.length === 0) throw new Error(`Không có ảnh trong ${SRC}`);
mkdirSync(OUT, { recursive: true });

// Same sizes as src/services/media.ts SIZES: half-body 1080x1440 (LED), avatar 320x320.
const browser = await chromium.launch();
const page = await browser.newPage();
const manifest = [];
for (const file of files) {
  const name = file.replace(/\.[^.]+$/, '');
  const mime = /\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${readFileSync(path.join(SRC, file)).toString('base64')}`;
  const [half, avatar] = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const render = (w: number, h: number, sx: number, sy: number, sw: number, sh: number) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      return c.toDataURL('image/webp', 0.85);
    };
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const scale = Math.min(1, 1080 / W, 1440 / H);
    // Portrait cut-outs, head near the middle: the avatar is a square of half the width from just above the head,
    // found as the first opaque row of the centre band (raised arms sit at the sides, outside it).
    const band = document.createElement('canvas');
    band.width = Math.round(W * 0.2);
    band.height = H;
    band.getContext('2d')!.drawImage(img, W * 0.4, 0, band.width, H, 0, 0, band.width, H);
    const alpha = band.getContext('2d')!.getImageData(0, 0, band.width, H).data;
    let top = 0;
    for (let y = 0; y < H && !top; y++) {
      let opaque = 0;
      for (let x = 0; x < band.width; x++) if (alpha[(y * band.width + x) * 4 + 3] > 128) opaque++;
      if (opaque > band.width * 0.2) top = y;
    }
    const side = Math.round(W * 0.5);
    const y0 = Math.max(0, Math.min(H - side, top - Math.round(H * 0.02)));
    return [render(Math.round(W * scale), Math.round(H * scale), 0, 0, W, H), render(320, 320, (W - side) / 2, y0, side, side)];
  }, dataUrl);
  for (const [suffix, url] of [['half', half], ['avatar', avatar]] as const)
    writeFileSync(path.join(OUT, `${name}-${suffix}.webp`), Buffer.from(url.split(',')[1], 'base64'));
  manifest.push({
    halfBodyUrl: `/image/seed/${name}-half.webp`,
    avatarUrl: `/image/seed/${name}-avatar.webp`,
    gender: female.has(name) ? 'female' : 'male',
  });
}
await browser.close();
writeFileSync(SAMPLE_PHOTO_MANIFEST, JSON.stringify(manifest, null, 2));
const girls = manifest.filter((m) => m.gender === 'female').length;
console.log(`${manifest.length} ảnh (${manifest.length - girls} BBOY, ${girls} BGIRL) -> ${path.relative(ROOT, OUT)}`);
