import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePhotos} from '../app/gallery.ts';
import {createGalleryHistory, defaultGalleryState, readGalleryUrl, writeGalleryUrl} from '../app/gallery-url.ts';

const photos = parsePhotos([
  {id: 'coast', title: 'Coast', src: 'photos/coast.jpg', tags: ['nature', 'travel'], date: '2026-11-07'},
  {id: 'city', title: 'City', src: 'photos/city.jpg', tags: ['city', 'golden hour'], date: '2026-11-06'},
  {id: 'sample', title: 'Inspiration', src: 'photos/forest.jpg', tags: ['nature'], date: '2026-11-05', sample: true},
  {id: 'café / photo?', title: '', src: 'photos/lake.jpg', tags: ['café', 'city, night'], date: '2026-11-04'},
]);
const url = query => new URL('https://example.github.io/gallery/' + query);
const albums = [{id: 'coastal-walks', title: 'Coastal walks', coverPhotoId: 'coast', photoIds: ['coast', 'sample']}];

test('album URLs round-trip with photo and tag selections, while unknown albums are ignored', () => {
  const state = readGalleryUrl(url('?album=coastal-walks&photo=coast&tags=nature#gallery'), photos, albums);
  assert.equal(state.albumId, 'coastal-walks');
  assert.equal(state.photoId, 'coast');
  const next = writeGalleryUrl(url('?source=friend#gallery'), state, photos, albums);
  assert.equal(next.searchParams.get('album'), 'coastal-walks');
  assert.equal(next.searchParams.get('source'), 'friend');
  assert.equal(next.hash, '#gallery');
  assert.deepEqual(readGalleryUrl(next, photos, albums), state);
  assert.equal(readGalleryUrl(url('?album=deleted'), photos, albums).albumId, null);
  assert.equal(writeGalleryUrl(url('?album=coastal-walks'), defaultGalleryState(), photos, albums).searchParams.has('album'), false);
});

test('album URLs retain only tags used by that album, including when serialized', () => {
  const state = readGalleryUrl(url('?album=coastal-walks&tags=nature&tags=city'), photos, albums);
  assert.deepEqual(state.tags, ['nature']);
  const written = writeGalleryUrl(url(''), {...defaultGalleryState(), albumId: 'coastal-walks', tags: ['city', 'nature']}, photos, albums);
  assert.deepEqual(written.searchParams.getAll('tags'), ['nature']);
  const browser = fakeBrowser(url('?album=coastal-walks&tags=city').href);
  let current;
  const history = createGalleryHistory(photos, browser, next => {current = next;}, albums);
  assert.deepEqual(current.tags, []);
  assert.equal(new URL(browser.location.href).searchParams.has('tags'), false);
  history.dispose();
});

test('repeated and comma-separated tags select known tags and a valid photo', () => {
  const state = readGalleryUrl(url('?tags= Nature,travel &tags=NATURE&tags=missing&photo=coast'), photos);
  assert.deepEqual(state.tags, ['nature', 'travel']);
  assert.equal(state.photoId, 'coast');
  assert.equal(state.showSamples, true);
});

test('missing, empty, and unknown parameters fall back to the gallery', () => {
  for (const query of ['', '?tags=&photo=', '?tags=missing&photo=deleted-photo']) {
    assert.deepEqual(readGalleryUrl(url(query), photos), defaultGalleryState());
  }
});

test('URLs preserve project paths, unrelated parameters, and hashes', () => {
  const original = new URL('https://example.github.io/my-gallery/index.html?utm_source=friend&tags=old#collection');
  const state = {...defaultGalleryState(), tags: ['travel', 'nature'], photoId: 'coast', query: 'morning & dusk', showSamples: false};
  const next = writeGalleryUrl(original, state, photos);
  assert.equal(next.origin, original.origin);
  assert.equal(next.pathname, '/my-gallery/index.html');
  assert.equal(next.hash, '#collection');
  assert.equal(next.searchParams.get('utm_source'), 'friend');
  assert.deepEqual(next.searchParams.getAll('tags'), ['nature', 'travel']);
  assert.equal(next.searchParams.get('photo'), 'coast');
  assert.equal(next.searchParams.get('q'), 'morning & dusk');
  assert.equal(next.searchParams.get('samples'), '0');
  assert.deepEqual(readGalleryUrl(next, photos), {...state, tags: ['nature', 'travel']});
  assert.equal(original.searchParams.get('tags'), 'old', 'Serialization must not mutate the input URL');
});

test('literal commas, spaces, Unicode tags, and reserved photo ID characters round-trip', () => {
  const state = {...defaultGalleryState(), tags: ['city, night', 'café', 'golden hour'], photoId: 'café / photo?'};
  const next = writeGalleryUrl(url(''), state, photos);
  assert.deepEqual(new Set(readGalleryUrl(next, photos).tags), new Set(state.tags));
  assert.equal(readGalleryUrl(next, photos).photoId, state.photoId);
});

test('clearing state removes owned parameters and preserves unrelated ones', () => {
  const next = writeGalleryUrl(url('?tags=nature&photo=coast&q=sea&samples=0&utm_campaign=photos'), defaultGalleryState(), photos);
  assert.equal(next.search, '?utm_campaign=photos');
});

test('an explicit valid photo can be opened even outside the active filters', () => {
  const state = readGalleryUrl(url('?tags=city&q=unmatched&samples=0&photo=sample'), photos);
  assert.equal(state.photoId, 'sample');
  assert.deepEqual(state.tags, ['city']);
  assert.equal(state.query, 'unmatched');
  assert.equal(state.showSamples, false);
});

function fakeBrowser(initial) {
  const events = new EventTarget();
  const entries = [new URL(initial)];
  let position = 0;
  return {
    location: {get href() {return entries[position].href;}},
    history: {
      state: null,
      pushState(_state, _unused, next) {
        const target = new URL(next, entries[position]);
        entries.splice(position + 1);
        entries.push(target);
        position++;
      },
      replaceState(_state, _unused, next) {entries[position] = new URL(next, entries[position]);},
    },
    addEventListener: (type, listener) => events.addEventListener(type, listener),
    removeEventListener: (type, listener) => events.removeEventListener(type, listener),
    back() {if (position) {position--; events.dispatchEvent(new Event('popstate'));}},
    forward() {if (position + 1 < entries.length) {position++; events.dispatchEvent(new Event('popstate'));}},
    get length() {return entries.length;},
  };
}

test('album, opened photo, and full gallery selections survive Back and Forward', () => {
  const browser = fakeBrowser(url('').href);
  let state;
  const history = createGalleryHistory(photos, browser, next => {state = next;}, albums);
  history.update({albumId: 'coastal-walks'});
  history.update({photoId: 'coast'});
  history.update({photoId: null, albumId: null});
  assert.equal(state.albumId, null);
  browser.back();
  assert.equal(state.albumId, 'coastal-walks');
  assert.equal(state.photoId, 'coast');
  browser.back();
  assert.equal(state.albumId, 'coastal-walks');
  assert.equal(state.photoId, null);
  browser.back();
  assert.equal(state.albumId, null);
  browser.forward();
  assert.equal(state.albumId, 'coastal-walks');
  history.dispose();
});

test('returning to albums clears album state and targets its cover in a single history entry', () => {
  const browser = fakeBrowser(url('?album=coastal-walks&tags=nature&photo=coast#gallery').href);
  let state;
  const history = createGalleryHistory(photos, browser, next => {state = next;}, albums);
  history.update(defaultGalleryState(), 'push', 'album-coastal-walks');
  const returned = new URL(browser.location.href);
  assert.equal(returned.pathname, '/gallery/');
  assert.equal(returned.search, '');
  assert.equal(returned.hash, '#album-coastal-walks');
  assert.deepEqual(state, defaultGalleryState());
  assert.equal(browser.length, 2);
  browser.back();
  assert.equal(state.albumId, 'coastal-walks');
  assert.equal(state.photoId, 'coast');
  assert.equal(new URL(browser.location.href).hash, '#gallery');
  browser.forward();
  assert.equal(state.albumId, null);
  assert.equal(new URL(browser.location.href).hash, '#album-coastal-walks');
  history.update({albumId: 'coastal-walks'}, 'push', 'gallery');
  assert.equal(new URL(browser.location.href).hash, '#gallery');
  history.dispose();
});

test('initial restoration cleans invalid values without adding browser history entries', () => {
  const browser = fakeBrowser(url('?tags=missing&tags=NATURE&photo=missing&source=email').href);
  let state;
  const history = createGalleryHistory(photos, browser, next => {state = next;});
  assert.deepEqual(state.tags, ['nature']);
  assert.equal(state.photoId, null);
  assert.equal(browser.length, 1);
  const current = new URL(browser.location.href);
  assert.deepEqual(current.searchParams.getAll('tags'), ['nature']);
  assert.equal(current.searchParams.get('source'), 'email');
  assert.equal(current.searchParams.has('photo'), false);
  history.dispose();
});

test('tag changes, photo navigation, closing, Back, and Forward restore matching state', () => {
  const browser = fakeBrowser(url('').href);
  let state;
  const history = createGalleryHistory(photos, browser, next => {state = next;});
  history.update({tags: ['nature']});
  history.update({photoId: 'coast'});
  history.update({photoId: 'sample'});
  history.update({photoId: null});
  assert.equal(new URL(browser.location.href).searchParams.has('photo'), false);
  assert.deepEqual(state.tags, ['nature']);
  browser.back();
  assert.equal(state.photoId, 'sample');
  browser.back();
  assert.equal(state.photoId, 'coast');
  browser.back();
  assert.equal(state.photoId, null);
  assert.deepEqual(state.tags, ['nature']);
  browser.back();
  assert.deepEqual(state.tags, []);
  browser.forward();
  browser.forward();
  assert.equal(state.photoId, 'coast');
  assert.equal(browser.length, 5, 'Restoring history must never push another history entry');
  history.dispose();
});

test('search replaces the current entry, identical actions add no entries, and cleanup stops restoration', () => {
  const browser = fakeBrowser(url('').href);
  let calls = 0;
  const history = createGalleryHistory(photos, browser, () => {calls++;});
  history.update({tags: ['nature']});
  history.update({tags: ['nature']});
  assert.equal(browser.length, 2);
  history.update({query: 'golden '}, 'replace');
  history.update({query: 'golden hour'}, 'replace');
  assert.equal(browser.length, 2);
  assert.equal(new URL(browser.location.href).searchParams.get('q'), 'golden hour');
  history.update(current => ({tags: [...current.tags, 'travel'], photoId: null}));
  assert.deepEqual(new URL(browser.location.href).searchParams.getAll('tags'), ['nature', 'travel']);
  history.dispose();
  const previousCalls = calls;
  browser.back();
  history.update({photoId: 'coast'});
  assert.equal(calls, previousCalls);
});
