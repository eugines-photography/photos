import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {prepareImage} from '../scripts/image-pipeline.mjs';
import {responsiveSource, responsiveHomepageSource, featuredPhotos, homepagePhoto} from '../app/image-sources.ts';

test('homepage photo selection accepts known IDs, supports automatic fallback, and rejects broken configuration', () => {
  const photos = [{id: 'my-panorama', src: 'photos/panorama.jpg'}];
  assert.equal(homepagePhoto(photos, 'my-panorama'), photos[0]);
  assert.equal(homepagePhoto(photos, ' my-panorama '), photos[0]);
  for (const value of [undefined, '', '  ']) assert.equal(homepagePhoto(photos, value), undefined);
  assert.throws(() => homepagePhoto(photos, 'missing'), /Unknown homepage photograph: missing/);
  for (const value of [null, 12, false]) assert.throws(() => homepagePhoto(photos, value), /homePhotoId/);
});

test('featured photos match each orientation and prefer owned photos over inspiration photos', () => {
  const photos = [
    {src: 'photos/sample.jpg', sample: true},
    {src: 'photos/portrait.jpg', sample: false},
    {src: 'photos/landscape.jpg', sample: false},
    {src: 'photos/later.jpg', sample: false},
  ];
  const assets = {
    'photos/sample.jpg': {width: 1600, height: 900},
    'photos/portrait.jpg': {width: 900, height: 1600},
    'photos/landscape.jpg': {width: 1600, height: 900},
    'photos/later.jpg': {width: 1600, height: 900},
  };
  assert.deepEqual(featuredPhotos(photos, assets), {landscape: photos[2], portrait: photos[1]});
  assert.equal(featuredPhotos(photos.slice(0, 2), assets).landscape, photos[0], 'Use a matching inspiration photo if needed');
});

test('featured photos fall back safely when an orientation or collection is unavailable', () => {
  const photo = {src: 'photos/only.jpg', sample: false};
  for (const assets of [{}, {[photo.src]: {width: 1200, height: 800}}, {[photo.src]: {width: 800, height: 800}}]) {
    assert.deepEqual(featuredPhotos([photo], assets), {landscape: photo, portrait: photo});
  }
  assert.deepEqual(featuredPhotos([], {}), {landscape: undefined, portrait: undefined});
});

test('large originals get responsive WebP previews without modifying the original', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stillframe-image-test-'));
  try {
    const original = await sharp(randomBytes(1600 * 1000 * 3), {raw: {width: 1600, height: 1000, channels: 3}}).jpeg({quality: 100}).toBuffer();
    assert.ok(original.length > 2 * 1024 * 1024, 'Fixture should represent a photo larger than 2 MB');
    const input = join(directory, 'large.jpg');
    await writeFile(input, original);
    const output = join(directory, 'previews');
    const image = await prepareImage(input, output);
    assert.deepEqual(image.variants.map(v => v.width), [320, 640, 960, 1600]);
    for (const variant of image.variants) {
      const file = join(output, variant.src.split('/').at(-1));
      const metadata = await sharp(file).metadata();
      assert.equal(metadata.format, 'webp');
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
      assert.equal(metadata.exif, undefined);
    }
    assert.ok(image.variants[1].bytes < original.length / 5, '640px preview should be substantially smaller than a multi-MB original');
    assert.deepEqual(await readFile(input), original);

    const cached = join(output, image.variants[0].src.split('/').at(-1));
    const modified = (await stat(cached)).mtimeMs;
    assert.deepEqual(await prepareImage(input, output), image);
    assert.equal((await stat(cached)).mtimeMs, modified, 'Unchanged previews should be reused');
    await writeFile(input, await sharp({create: {width: 1600, height: 1000, channels: 3, background: '#536a4d'}}).jpeg().toBuffer());
    const replacement = await prepareImage(input, output);
    assert.notEqual(replacement.variants[0].src, image.variants[0].src, 'Changed image content must change its cache URL');
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('camera orientation is corrected and small images are never upscaled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stillframe-orientation-test-'));
  try {
    const input = join(directory, 'rotated.jpg');
    await sharp({create: {width: 80, height: 40, channels: 3, background: '#596b4d'}}).withMetadata({orientation: 6}).jpeg().toFile(input);
    const image = await prepareImage(input, join(directory, 'previews'));
    assert.equal(image.width, 40);
    assert.equal(image.height, 80);
    assert.equal(image.variants.length, 1);
    assert.equal(image.variants[0].width, 40);
    const metadata = await sharp(join(directory, 'previews', image.variants[0].src.split('/').at(-1))).metadata();
    assert.equal(metadata.width, 40);
    assert.equal(metadata.height, 80);
    assert.equal(metadata.orientation, undefined);
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('homepage previews use larger sizes and separate quality caches without enlarging the source', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stillframe-homepage-test-'));
  try {
    const input = join(directory, 'home.jpg');
    await sharp({create: {width: 4000, height: 800, channels: 3, background: '#596b4d'}}).jpeg().toFile(input);
    const original = await readFile(input);
    const output = join(directory, 'previews');
    const standard = await prepareImage(input, output);
    const options = {widths: [1600, 3200, 4800, 6400], quality: 85};
    const larger = await prepareImage(input, output, 'generated/images', options);
    assert.deepEqual(larger.variants.map(variant => variant.width), [1600, 3200, 4000]);
    assert.notEqual(larger.variants[0].src, standard.variants.at(-1).src, 'Different compression settings need different cache URLs');
    const last = await sharp(join(output, larger.variants.at(-1).src.split('/').at(-1))).metadata();
    assert.equal(last.width, 4000);
    assert.equal(last.height, 800);
    const file = join(output, larger.variants[0].src.split('/').at(-1));
    const modified = (await stat(file)).mtimeMs;
    assert.deepEqual(await prepareImage(input, output, 'generated/images', options), larger);
    assert.equal((await stat(file)).mtimeMs, modified);
    assert.deepEqual(await readFile(input), original);
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('responsive sources use GitHub Pages paths and thumbnails never fall back to originals', () => {
  const asset = {width: 2400, height: 1600, originalBytes: 2_500_000, variants: [320, 640, 960, 1600].map(width => ({width, height: Math.round(width * 2 / 3), bytes: 1000, src: `generated/images/hash-${width}.webp`}))};
  const thumbnail = responsiveSource(asset, '/photo-journal/', 960);
  assert.equal(thumbnail.src, '/photo-journal/generated/images/hash-640.webp');
  assert.ok(thumbnail.srcSet.includes('320w') && thumbnail.srcSet.includes('960w'));
  assert.ok(!thumbnail.srcSet.includes('1600w'));
  assert.ok(responsiveSource(asset, '/photo-journal/').srcSet.includes('1600w'));
  asset.homeVariants = [3200, 4800, 6400, 9600, 12000].map(width => ({width, height: Math.round(width * 2 / 3), bytes: 1000, src: `generated/images/home-${width}.webp`}));
  const home = responsiveHomepageSource(asset, '/photo-journal/');
  assert.equal(home.src, '/photo-journal/generated/images/hash-1600.webp');
  assert.ok(home.srcSet.includes('/photo-journal/generated/images/home-9600.webp 9600w'));
  assert.ok(home.srcSet.includes('12000w'));
  assert.ok(!responsiveSource(asset, '/photo-journal/').srcSet.includes('3200w'), 'Large homepage images must not leak into other views');
});
