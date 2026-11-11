import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {parsePhotos} from '../app/gallery.ts';
import {parseAlbums} from '../app/albums.ts';
import {homepagePhoto} from '../app/image-sources.ts';
import {parseUmamiConfig} from '../app/analytics.ts';

const photos = parsePhotos(JSON.parse(await readFile('content/photos.json', 'utf8')));
const albums = parseAlbums(JSON.parse(await readFile('content/albums.json', 'utf8')), photos);
const site = JSON.parse(await readFile('content/site.json', 'utf8'));
parseUmamiConfig(site.umami);
if (site.showPhotoIds !== undefined && typeof site.showPhotoIds !== 'boolean') throw new Error('content/site.json showPhotoIds must be true or false.');
homepagePhoto(photos, site.homePhotoId);
const about = JSON.parse(await readFile('content/about.json', 'utf8'));
for (const key of ['name', 'image', 'imageAlt']) {
  if (typeof about[key] !== 'string' || !about[key].trim()) throw new Error(`content/about.json needs a nonempty ${key}.`);
}
if (about.headline !== undefined && typeof about.headline !== 'string') throw new Error('About Me headline must be a string when provided.');
if (!Array.isArray(about.paragraphs) || !about.paragraphs.length || about.paragraphs.some(paragraph => typeof paragraph !== 'string' || !paragraph.trim())) throw new Error('About Me needs at least one bio paragraph.');
if (!about.image.startsWith('photos/') || !/\.(jpe?g|png|webp|gif|avif)$/i.test(about.image)) throw new Error('About Me image must be an image inside public/photos/.');
const publicRoot = await realpath('public');
for (const src of new Set([...photos.map(photo => photo.src), about.image])) {
  const photo = {src};
  const file = await realpath(resolve('public', photo.src)).catch(() => {throw new Error(`Missing photograph: public/${photo.src}`);});
  if (!file.startsWith(publicRoot + sep)) throw new Error(`Photograph must stay inside public/: ${photo.src}`);
  const info = await stat(file);
  if (!info.isFile() || !info.size || info.size > 50 * 1024 * 1024) throw new Error(`Photograph must be nonempty and at most 50 MiB: ${photo.src}`);
}
console.log(`Validated ${photos.length} photographs, ${albums.length} albums, their tags, and the About Me content.`);
