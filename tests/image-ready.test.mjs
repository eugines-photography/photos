import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchImageReady} from '../app/image-ready.ts';

function fakeImage({complete = false, naturalWidth = 0} = {}) {
  const image = new EventTarget();
  let resolve, reject;
  image.complete = complete;
  image.naturalWidth = naturalWidth;
  image.decode = () => new Promise((yes, no) => {resolve = yes; reject = no;});
  return {image, decode: async () => {resolve(); await Promise.resolve();}, failDecode: async () => {reject(Error('Decode failed')); await Promise.resolve();}};
}

test('the preview stays visible until the original finishes decoding', async () => {
  const {image, decode} = fakeImage();
  let ready = 0, errors = 0;
  const cleanup = watchImageReady(image, () => ready++, () => errors++);
  assert.equal(ready, 0);
  image.dispatchEvent(new Event('load'));
  assert.equal(ready, 0);
  await decode();
  assert.equal(ready, 1);
  assert.equal(errors, 0);
  image.dispatchEvent(new Event('load'));
  assert.equal(ready, 1);
  cleanup();
});

test('a cached original also waits for decoding before replacing the preview', async () => {
  const {image, decode} = fakeImage({complete: true, naturalWidth: 4000});
  let ready = false;
  const cleanup = watchImageReady(image, () => {ready = true;}, () => assert.fail('Unexpected failure'));
  assert.equal(ready, false);
  await decode();
  assert.equal(ready, true);
  cleanup();
});

test('closing or changing the photo ignores a late original download', async () => {
  const {image, decode} = fakeImage();
  let called = false;
  const cleanup = watchImageReady(image, () => {called = true;}, () => {called = true;});
  image.dispatchEvent(new Event('load'));
  cleanup();
  await decode();
  image.dispatchEvent(new Event('error'));
  assert.equal(called, false);
});

test('network and decoding failures retain the preview and report an error once', async () => {
  for (const failure of ['network', 'decode', 'cached-error']) {
    const {image, failDecode} = fakeImage({complete: failure === 'cached-error'});
    let ready = false, errors = 0;
    const cleanup = watchImageReady(image, () => {ready = true;}, () => errors++);
    if (failure === 'network') image.dispatchEvent(new Event('error'));
    if (failure === 'decode') {image.dispatchEvent(new Event('load')); await failDecode();}
    image.dispatchEvent(new Event('error'));
    assert.equal(errors, 1);
    assert.equal(ready, false);
    cleanup();
  }
});
