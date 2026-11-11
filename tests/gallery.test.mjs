import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {countTags, parsePhotos, photoUrl, selectPhotos} from '../app/gallery.ts';

const entry = {id: 'coast', title: 'Coastal morning', src: 'photos/coast.jpg', tags: ['Ocean', ' travel ', 'ocean'], date: '2026-11-06'};
const rows = [
  entry,
  {...entry, id: 'forest', title: 'A quiet forest', tags: ['nature'], date: '2026-11-05'},
  {...entry, id: 'sample', title: 'Inspiration', tags: ['nature'], date: '2026-11-04', sample: true},
];
const options = {tags: [], query: '', sort: 'newest', showSamples: true};

test('the repository manifest parses and preserves the migrated photograph', async () => {
  const manifest = JSON.parse(await readFile(new URL('../content/photos.json', import.meta.url), 'utf8'));
  const photos = parsePhotos(manifest);
  assert.equal(photos.length, manifest.length);
  assert.ok(photos.length > 0);
  assert.ok(photos.every(photo => !photo.src.startsWith('/api/')));
});

test('photo metadata normalizes tags without duplicates', () => {
  const [photo] = parsePhotos([entry]);
  assert.deepEqual(photo.tags, ['ocean', 'travel']);
  assert.equal(photo.sample, false);
  assert.equal(photo.createdAt, Date.parse(entry.date));
});

test('per-photo panorama starting positions allow either edge and preserve the default', () => {
  assert.equal(parsePhotos([entry])[0].panStart, 1 / 3);
  for (const panStart of [0, 0.25, 0.5, 1]) {
    assert.equal(parsePhotos([{...entry, panStart}])[0].panStart, panStart);
  }
  for (const panStart of [-0.1, 1.1, '0.5', null, true, NaN, Infinity]) {
    assert.throws(() => parsePhotos([{...entry, panStart}]), /panStart/);
  }
});

test('tag counts are alphabetical, count each photo once, and respect the available collection', () => {
  const photos = parsePhotos([
    {...entry, id: 'one', tags: ['urban', 'travel', 'urban']},
    {...entry, id: 'two', tags: ['urban', 'nature']},
    {...entry, id: 'three', tags: ['urban', 'nature', 'architecture']},
    {...entry, id: 'four', tags: ['nature'], sample: true},
  ]);
  const original = structuredClone(photos);
  assert.deepEqual([...countTags(photos)], [['architecture', 1], ['nature', 3], ['travel', 1], ['urban', 3]]);
  assert.deepEqual([...countTags(photos.filter(photo => !photo.sample))], [['architecture', 1], ['nature', 2], ['travel', 1], ['urban', 3]]);
  assert.deepEqual([...countTags(photos.filter(photo => photo.id === 'one'))], [['travel', 1], ['urban', 1]]);
  assert.deepEqual([...countTags([])], []);
  assert.deepEqual([...countTags(parsePhotos([{...entry, tags: []}]))], []);
  assert.deepEqual(photos, original);
});

test('empty, whitespace-only, omitted, and null titles normalize to an empty title', () => {
  const {title, ...untitled} = entry;
  const photos = parsePhotos([
    {...entry, id: 'empty', title: ''},
    {...entry, id: 'whitespace', title: ' \t\n '},
    {...untitled, id: 'omitted'},
    {...entry, id: 'null', title: null},
  ]);
  assert.ok(photos.every(photo => photo.title === ''));
  assert.equal(selectPhotos(photos, {...options, query: 'travel'}).length, 4);
  assert.equal(selectPhotos(photos, {...options, sort: 'title'}).length, 4);
});

test('photo descriptions are preserved with internal line breaks', () => {
  const [photo] = parsePhotos([{...entry, description: '  Morning light.\nA quiet moment.  '}]);
  assert.equal(photo.description, 'Morning light.\nA quiet moment.');
});

test('missing, blank, and null descriptions are omitted', () => {
  for (const description of [undefined, null, '', ' \t\n ']) {
    const [photo] = parsePhotos([{...entry, description}]);
    assert.equal(photo.description, undefined);
  }
  assert.throws(() => parsePhotos([{...entry, description: 42}]), /description/);
});

test('tags, text search, and inspiration visibility combine correctly', () => {
  const photos = parsePhotos(rows);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['nature'], showSamples: false}).map(p => p.id), ['forest']);
  assert.deepEqual(selectPhotos(photos, {...options, query: ' TRAVEL '}).map(p => p.id), ['coast']);
  assert.deepEqual(selectPhotos(photos, {...options, query: 'QUIET', tags: ['nature']}).map(p => p.id), ['forest']);
  assert.deepEqual(selectPhotos(photos, {...options, query: 'unmatched'}), []);
});

test('multiple selected tags match any tag and never duplicate a photograph', () => {
  const photos = parsePhotos(rows);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['ocean', 'nature']}).map(p => p.id), ['coast', 'forest', 'sample']);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['ocean', 'travel']}).map(p => p.id), ['coast']);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['missing', 'nature'], showSamples: false}).map(p => p.id), ['forest']);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['ocean', 'nature'], query: 'quiet'}).map(p => p.id), ['forest']);
  assert.deepEqual(selectPhotos(photos, {...options, tags: ['missing']}).map(p => p.id), []);
  assert.deepEqual(selectPhotos(photos, {...options, tags: []}).map(p => p.id), ['coast', 'forest', 'sample']);
});

test('sorting follows dates and titles without changing the source collection', () => {
  const photos = parsePhotos(rows);
  const original = [...photos];
  assert.deepEqual(selectPhotos(photos, options).map(p => p.id), ['coast', 'forest', 'sample']);
  assert.deepEqual(selectPhotos(photos, {...options, sort: 'oldest'}).map(p => p.id), ['sample', 'forest', 'coast']);
  assert.deepEqual(selectPhotos(photos, {...options, sort: 'title'}).map(p => p.id), ['forest', 'coast', 'sample']);
  assert.deepEqual(photos, original);
});

const taggedPhoto = (id, tags, day) => ({...entry, id, title: id, tags, date: `2026-11-${String(day).padStart(2, '0')}`});
const cycleOptions = {...options, sort: 'tag-cycle'};

test('album variety alternates subjects despite a shared album tag', () => {
  const photos = parsePhotos([
    taggedPhoto('mountain-new', ['landscape', 'mountains'], 10),
    taggedPhoto('mountain-old', ['landscape', 'mountains'], 9),
    taggedPhoto('stars-new', ['landscape', 'stars'], 8),
    taggedPhoto('stars-old', ['landscape', 'stars'], 7),
    taggedPhoto('waterfall', ['landscape', 'waterfall'], 6),
  ]);
  const original = structuredClone(photos);
  const result = selectPhotos(photos, {...options, sort: 'tag-variety'});
  assert.deepEqual(result.slice(0, 3).map(photo => photo.id), ['mountain-new', 'stars-new', 'waterfall']);
  assert.equal(new Set(result.map(photo => photo.id)).size, photos.length);
  assert.deepEqual(photos, original);
});

test('album variety respects filters and preserves date order when tags are identical', () => {
  const photos = parsePhotos([
    taggedPhoto('mountain-new', ['landscape', 'mountains'], 10),
    taggedPhoto('mountain-old', ['landscape', 'mountains'], 9),
    {...taggedPhoto('sample', ['landscape', 'stars'], 11), sample: true},
  ]);
  const variety = {...options, sort: 'tag-variety', showSamples: false};
  assert.deepEqual(selectPhotos(photos, variety).map(photo => photo.id), ['mountain-new', 'mountain-old']);
  assert.deepEqual(selectPhotos(photos, {...variety, tags: ['mountains'], query: 'old'}).map(photo => photo.id), ['mountain-old']);
  assert.deepEqual(selectPhotos([], variety), []);
  assert.deepEqual(selectPhotos(parsePhotos([taggedPhoto('untagged', [], 10)]), variety).map(photo => photo.id), ['untagged']);
});

test('tag rotation takes one photograph per tag before repeating and skips exhausted tags', () => {
  const photos = parsePhotos([
    taggedPhoto('a-old', ['a'], 1), taggedPhoto('b-new', ['b'], 8), taggedPhoto('c-only', ['c'], 5),
    taggedPhoto('a-new', ['a'], 9), taggedPhoto('b-old', ['b'], 2), taggedPhoto('a-mid', ['a'], 7),
  ]);
  const original = [...photos];
  assert.deepEqual(selectPhotos(photos, cycleOptions).map(p => p.id), ['a-new', 'b-new', 'c-only', 'a-mid', 'b-old', 'a-old']);
  assert.deepEqual(photos, original);
});

test('photos with overlapping tags appear only once in the rotation', () => {
  const photos = parsePhotos([
    taggedPhoto('shared', ['a', 'b'], 10), taggedPhoto('a-only', ['a'], 9),
    taggedPhoto('b-only', ['b'], 8), taggedPhoto('c-only', ['c'], 7),
  ]);
  assert.deepEqual(selectPhotos(photos, cycleOptions).map(p => p.id), ['shared', 'b-only', 'c-only', 'a-only']);
  const sharedOnly = parsePhotos([taggedPhoto('first', ['a', 'b'], 2), taggedPhoto('second', ['a', 'b'], 1)]);
  assert.deepEqual(selectPhotos(sharedOnly, cycleOptions).map(p => p.id), ['first', 'second']);
});

test('rotation respects selected tags, search, and inspiration visibility', () => {
  const photos = parsePhotos([
    taggedPhoto('landscape-a', ['a', 'x'], 10), taggedPhoto('landscape-a2', ['a', 'x'], 9),
    taggedPhoto('landscape-b', ['b'], 8), taggedPhoto('portrait-c', ['c'], 7),
    {...taggedPhoto('landscape-example', ['b'], 11), sample: true},
  ]);
  assert.deepEqual(selectPhotos(photos, {...cycleOptions, tags: ['b', 'a'], query: 'landscape', showSamples: false}).map(p => p.id), ['landscape-a', 'landscape-b', 'landscape-a2']);
  assert.deepEqual(selectPhotos(photos, {...cycleOptions, tags: ['missing']}).map(p => p.id), []);
});

test('untagged photographs remain visible and empty collections terminate', () => {
  const photos = parsePhotos([taggedPhoto('untagged-new', [], 10), taggedPhoto('tagged', ['a'], 8), taggedPhoto('untagged-old', [], 1)]);
  assert.deepEqual(selectPhotos(photos, cycleOptions).map(p => p.id), ['tagged', 'untagged-new', 'untagged-old']);
  assert.deepEqual(selectPhotos(photos.filter(p => !p.tags.length), cycleOptions).map(p => p.id), ['untagged-new', 'untagged-old']);
  assert.deepEqual(selectPhotos([], cycleOptions), []);
});

test('photo paths work on user Pages, project Pages, and filenames with spaces', () => {
  assert.equal(photoUrl('photos/coast.jpg', '/'), '/photos/coast.jpg');
  assert.equal(photoUrl('photos/coast.jpg', '/stillframe/'), '/stillframe/photos/coast.jpg');
  assert.equal(photoUrl('photos/coast.jpg', '/stillframe'), '/stillframe/photos/coast.jpg');
  assert.equal(photoUrl('photos/My photo.jpg', '/gallery/'), '/gallery/photos/My%20photo.jpg');
});

test('unsafe and unsupported photo paths fail before deployment', () => {
  for (const src of ['/photos/coast.jpg', 'https://example.com/coast.jpg', 'photos/../.dev.vars.jpg', 'photos/a/../../secret.jpg', 'photos//coast.jpg', 'photos/coast.svg', 'photos/coast.jpg?key=secret', 'photos\\coast.jpg']) {
    assert.throws(() => parsePhotos([{...entry, src}]), /src must be/);
  }
});

test('invalid manifests fail with useful validation messages', () => {
  assert.throws(() => parsePhotos({}), /array/);
  assert.throws(() => parsePhotos([entry, entry]), /unique/);
  assert.throws(() => parsePhotos([{...entry, id: ''}]), /id/);
  assert.throws(() => parsePhotos([{...entry, title: 42}]), /title/);
  assert.throws(() => parsePhotos([{...entry, date: 'not-a-date'}]), /date/);
  assert.throws(() => parsePhotos([{...entry, tags: 'nature'}]), /tags/);
  assert.throws(() => parsePhotos([{...entry, tags: ['']}]), /tags/);
  assert.throws(() => parsePhotos([{...entry, sample: 'true'}]), /sample/);
  assert.deepEqual(parsePhotos([]), []);
});
