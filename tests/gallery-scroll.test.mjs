import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galleryScrollTarget, restoreGalleryScroll, restorePhotoPosition} from '../app/gallery-scroll.ts';

function fixture(initial) {
  const events = new EventTarget();
  const frames = new Map();
  const scrolls = [];
  let nextFrame = 0;
  let mounted = false;
  const browser = {
    location: {href: 'https://example.github.io/photos/' + initial},
    requestAnimationFrame(callback) {const id = nextFrame++; frames.set(id, callback); return id;},
    cancelAnimationFrame(id) {frames.delete(id);},
    addEventListener: (type, listener) => events.addEventListener(type, listener),
    removeEventListener: (type, listener) => events.removeEventListener(type, listener),
  };
  const document = {getElementById(id) {return mounted ? {scrollIntoView(options) {scrolls.push({id, options});}} : null;}};
  return {
    browser, document, scrolls,
    mount() {mounted = true;},
    flush() {const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0));},
    navigate(fragment, type = 'hashchange') {browser.location.href = 'https://example.github.io/photos/' + fragment; events.dispatchEvent(new Event(type));},
  };
}

test('explicit album section links take priority over a selected album', () => {
  assert.equal(galleryScrollTarget(new URL('https://example.com/?album=urban#albums')), 'albums');
  assert.equal(galleryScrollTarget(new URL('https://example.com/?album=urban#album-birds')), 'album-birds');
  assert.equal(galleryScrollTarget(new URL('https://example.com/?album=urban')), 'gallery');
  assert.equal(galleryScrollTarget(new URL('https://example.com/#gallery')), 'gallery');
  assert.equal(galleryScrollTarget(new URL('https://example.com/')), null);
  assert.equal(galleryScrollTarget(new URL('https://example.com/#unrelated')), null);
});

test('initial #albums links scroll after the client mounts the target', () => {
  const app = fixture('#albums');
  const dispose = restoreGalleryScroll(app.browser, app.document);
  assert.equal(app.scrolls.length, 0);
  app.mount();
  app.flush();
  assert.deepEqual(app.scrolls, [{id: 'albums', options: {behavior: 'instant', block: 'start'}}]);
  dispose();
});

test('album return links restore the clicked cover after the grid mounts', () => {
  const app = fixture('#album-later-album');
  const dispose = restoreGalleryScroll(app.browser, app.document);
  app.mount();
  app.flush();
  assert.deepEqual(app.scrolls, [{id: 'album-later-album', options: {behavior: 'instant', block: 'start'}}]);
  dispose();
});

test('a removed album return target falls back to the album list', () => {
  const app = fixture('#album-removed');
  app.document.getElementById = id => id === 'albums' ? {scrollIntoView(options) {app.scrolls.push({id, options});}} : null;
  const dispose = restoreGalleryScroll(app.browser, app.document);
  app.flush();
  assert.deepEqual(app.scrolls.map(scroll => scroll.id), ['albums']);
  dispose();
});

test('hash changes and browser history restore the corresponding section', () => {
  const app = fixture('');
  app.mount();
  const dispose = restoreGalleryScroll(app.browser, app.document);
  app.flush();
  assert.equal(app.scrolls.length, 0);
  app.navigate('?album=urban#gallery');
  app.flush();
  app.navigate('#albums', 'popstate');
  app.flush();
  assert.deepEqual(app.scrolls.map(scroll => scroll.id), ['gallery', 'albums']);
  dispose();
});

test('rapid navigation and cleanup cancel obsolete fragment jumps', () => {
  const app = fixture('#albums');
  app.mount();
  const dispose = restoreGalleryScroll(app.browser, app.document);
  app.navigate('#gallery');
  app.navigate('#albums', 'popstate');
  app.flush();
  assert.deepEqual(app.scrolls.map(scroll => scroll.id), ['albums']);
  app.navigate('#gallery');
  dispose();
  app.flush();
  app.navigate('#albums');
  app.flush();
  assert.equal(app.scrolls.length, 1);
});

test('photo back/forward navigation and closing do not jump to the same album header', () => {
  const app = fixture('?album=urban#gallery');
  app.mount();
  const dispose = restoreGalleryScroll(app.browser, app.document);
  app.flush();
  for (const url of ['?album=urban&photo=one#gallery', '?album=urban&photo=two#gallery', '?album=urban#gallery']) {
    app.navigate(url, 'popstate');
    app.flush();
  }
  assert.deepEqual(app.scrolls.map(scroll => scroll.id), ['gallery']);
  app.navigate('?album=portraits#gallery', 'popstate');
  app.flush();
  assert.equal(app.scrolls.length, 2);
  dispose();
});

test('closing returns focus and scroll to the last viewed photo after layout', () => {
  const app = fixture('?album=urban#gallery');
  const calls = [];
  app.document.getElementById = id => id === 'gallery-photo-last/viewed' ? {
    querySelector() {return {focus(options) {calls.push(['focus', options]);}};},
    scrollIntoView(options) {calls.push(['scroll', options]);},
  } : null;
  app.browser.scrollTo = () => assert.fail('existing photo should be used');
  restorePhotoPosition(app.browser, app.document, 'last/viewed', {left: 0, top: 2000});
  assert.deepEqual(calls, []);
  app.flush();
  assert.deepEqual(calls, [
    ['focus', {preventScroll: true}],
    ['scroll', {behavior: 'instant', block: 'nearest', inline: 'nearest'}],
  ]);
});

test('missing photos restore the saved position and obsolete close restorations are canceled', () => {
  const app = fixture('#gallery');
  const calls = [];
  app.browser.scrollTo = options => calls.push(options);
  restorePhotoPosition(app.browser, app.document, 'missing', {left: 10, top: 2500});
  app.flush();
  assert.deepEqual(calls, [{left: 10, top: 2500, behavior: 'instant'}]);
  const cancel = restorePhotoPosition(app.browser, app.document, 'another', {left: 0, top: 0});
  cancel();
  app.flush();
  assert.equal(calls.length, 1);
});
