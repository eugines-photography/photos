import {mkdir, readFile, readdir, rename, unlink, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {prepareImage} from './image-pipeline.mjs';

sharp.concurrency(2);
const photos = JSON.parse(await readFile('content/photos.json', 'utf8'));
const about = JSON.parse(await readFile('content/about.json', 'utf8'));
const site = JSON.parse(await readFile('content/site.json', 'utf8'));
if (site.homePhotoId !== undefined && typeof site.homePhotoId !== 'string') throw new Error('content/site.json homePhotoId must be a photo ID or an empty string.');
const homeId = site.homePhotoId?.trim();
const home = photos.find(photo => photo.id === homeId);
if (homeId && !home) throw new Error(`Unknown homepage photograph: ${homeId}. Set content/site.json homePhotoId to an ID from content/photos.json.`);
const sources = [...new Set([...photos.map(photo => photo.src), about.image])];
const manifest = {};
for (const src of sources) {
  // Validation runs before generation in builds; keep this command safe on its own.
  if (typeof src !== 'string' || !src.startsWith('photos/') || src.split('/').some(part => !part || part === '.' || part === '..') || src.includes('\\')) throw new Error(`Invalid photograph path: ${src}`);
  manifest[src] = await prepareImage(resolve('public', src), resolve('public/generated/images'));
  if (src === home?.src && manifest[src].width > 1600) {
    const larger = await prepareImage(resolve('public', src), resolve('public/generated/images'), 'generated/images', {
      widths: [3200, 4800, 6400, 9600, 12000], quality: 85,
    });
    manifest[src].homeVariants = larger.variants;
  }
}
await mkdir('content/generated', {recursive: true});
const temporaryManifest = `content/generated/images.${process.pid}.tmp`;
await writeFile(temporaryManifest, JSON.stringify(manifest, null, 2) + '\n');
await rename(temporaryManifest, 'content/generated/images.json');
// A removed photo must not leave a stale preview in the published directory.
const used = new Set(Object.values(manifest).flatMap(image => [...image.variants, ...(image.homeVariants ?? [])].map(variant => variant.src.split('/').at(-1))));
for (const name of await readdir('public/generated/images')) {
  if (/^[a-f0-9]{20}-\d+\.webp$/.test(name) && !used.has(name)) await unlink(resolve('public/generated/images', name));
}
const totals = Object.values(manifest).reduce((total, image) => {
  total.originals += image.originalBytes;
  total.previews += image.variants.find(variant => variant.width >= 640)?.bytes ?? image.variants.at(-1).bytes;
  return total;
}, {originals: 0, previews: 0});
console.log(`Prepared ${sources.length} photographs: original total ${(totals.originals / 1024).toFixed(0)} KiB; 640px previews ${(totals.previews / 1024).toFixed(0)} KiB (${(100 * (1 - totals.previews / totals.originals)).toFixed(0)}% smaller).`);
