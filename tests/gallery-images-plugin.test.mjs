import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createImageQueue, isGalleryImageSource} from '../scripts/gallery-images-plugin.ts';

test('the watcher handles photo/metadata changes without watching its own generated files', () => {
  const root = resolve('work/watch-fixture');
  for (const file of ['content/photos.json', 'content/about.json', 'content/site.json', 'public/photos/new.JPG', 'public/photos/subfolder/new.webp']) {
    assert.equal(isGalleryImageSource(root, resolve(root, file)), true);
  }
  for (const file of ['content/generated/images.json', 'public/generated/images/hash-640.webp', 'public/fonts/font.woff2', 'README.md', '../photos/outside.jpg']) {
    assert.equal(isGalleryImageSource(root, resolve(root, file)), false);
  }
});

test('a burst of file updates produces a single generation run', async () => {
  let calls = 0;
  const queue = createImageQueue(async () => {calls++;}, 0);
  const first = queue.request();
  assert.equal(queue.request(), first);
  assert.equal(queue.request(), first);
  await queue.idle();
  assert.equal(calls, 1);
});

test('edits during generation wait for a second run and requests wait for both', async () => {
  let releaseFirst, signalStarted;
  const started = new Promise(done => {signalStarted = done;});
  const blocker = new Promise(done => {releaseFirst = done;});
  let calls = 0, active = 0, maximum = 0;
  const queue = createImageQueue(async () => {
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    if (calls === 1) {signalStarted(); await blocker;}
    active--;
  }, 0);
  const first = queue.request();
  await started;
  const idle = queue.idle();
  const second = queue.request();
  assert.notEqual(first, second);
  assert.equal(queue.request(), second);
  releaseFirst();
  await idle;
  assert.equal(calls, 2);
  assert.equal(maximum, 1, 'Generation runs must never overlap');
});

test('fixing an invalid file allows generation to recover after an error', async () => {
  let calls = 0;
  const queue = createImageQueue(async () => {if (++calls === 1) throw Error('Missing source photo');}, 0);
  await assert.rejects(queue.request(), /Missing source photo/);
  await queue.request();
  await queue.idle();
  assert.equal(calls, 2);
});
