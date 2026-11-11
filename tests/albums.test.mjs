import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseAlbums, photosForAlbum, prioritizeAlbumHighlights} from '../app/albums.ts';
import {parsePhotos, selectPhotos} from '../app/gallery.ts';

const photos = parsePhotos([
  {id: 'coast', src: 'photos/coast.jpg', tags: ['nature'], date: '2026-11-07'},
  {id: 'city', src: 'photos/city.jpg', tags: ['urban'], date: '2026-11-06'},
  {id: 'forest', src: 'photos/forest.jpg', tags: ['nature'], date: '2026-11-05', sample: true},
]);
const entry = {id: 'quiet-places', title: ' Quiet places ', description: ' Along the coast. ', coverPhotoId: 'coast', photoIds: ['coast', 'forest']};

test('configured albums reference existing photos and a cover in the album', async () => {
  const repositoryPhotos = parsePhotos(JSON.parse(await readFile(new URL('../content/photos.json', import.meta.url), 'utf8')));
  const manifest = JSON.parse(await readFile(new URL('../content/albums.json', import.meta.url), 'utf8'));
  assert.equal(parseAlbums(manifest, repositoryPhotos).length, manifest.length);
});

test('album definitions preserve ordering, normalize optional text, and allow shared photos', () => {
  const input = [entry, {...entry, id: 'another-album', title: 'Another album', description: '', zoomOut: true, startZoom: 1.5, highlightedPhotoIds: ['forest', 'coast']}];
  const albums = parseAlbums(input, photos);
  assert.deepEqual(albums.map(album => album.id), ['quiet-places', 'another-album']);
  assert.equal(albums[0].title, 'Quiet places');
  assert.equal(albums[0].description, 'Along the coast.');
  assert.equal(albums[1].description, undefined);
  assert.equal(albums[0].zoomOut, false);
  assert.equal(albums[1].zoomOut, true);
  assert.equal(albums[0].startZoom, 1);
  assert.equal(albums[1].startZoom, 1.5);
  assert.equal(albums[0].coverColumns, 1);
  assert.equal(albums[0].autoPan, true);
  assert.equal(parseAlbums([{...entry, autoPan: false}], photos)[0].autoPan, false);
  assert.equal(parseAlbums([{...entry, coverColumns: 2}], photos)[0].coverColumns, 2);
  assert.deepEqual(albums[0].highlightedPhotoIds, []);
  assert.deepEqual(albums[1].highlightedPhotoIds, ['forest', 'coast']);
  assert.notEqual(albums[1].highlightedPhotoIds, input[1].highlightedPhotoIds);
  assert.equal(parseAlbums([{...entry, startZoom: 1}], photos)[0].startZoom, 1);
  assert.equal(parseAlbums([{...entry, zoomOut: false}], photos)[0].zoomOut, false);
  assert.notEqual(albums[0].photoIds, entry.photoIds);
  assert.deepEqual(parseAlbums([], photos), []);
});

test('album membership combines with tag filters and inspiration visibility without changing the full gallery', () => {
  const [album] = parseAlbums([entry], photos);
  const original = structuredClone(photos);
  const members = photosForAlbum(photos, album);
  assert.deepEqual(members.map(photo => photo.id), ['coast', 'forest']);
  assert.deepEqual(selectPhotos(members, {tags: ['nature'], query: '', sort: 'tag-cycle', showSamples: false}).map(photo => photo.id), ['coast']);
  assert.deepEqual(selectPhotos(members, {tags: ['urban'], query: '', sort: 'tag-cycle', showSamples: true}), []);
  assert.deepEqual(photosForAlbum(photos, null), original);
  assert.deepEqual(photos, original);
});

test('album banners can differ from grid covers and empty settings fall back to the cover', () => {
  for (const bannerPhotoId of [undefined, '', '  ']) {
    assert.equal(parseAlbums([{...entry, bannerPhotoId}], photos)[0].bannerPhotoId, 'coast');
  }
  const [album] = parseAlbums([{...entry, bannerPhotoId: 'forest'}], photos);
  assert.equal(album.bannerPhotoId, 'forest');
  assert.equal(album.coverPhotoId, 'coast');
  assert.deepEqual(album.photoIds, entry.photoIds);
  for (const bannerPhotoId of [null, 1, true, 'missing', 'city']) {
    assert.throws(() => parseAlbums([{...entry, bannerPhotoId}], photos), /bannerPhotoId/);
  }
});

test('invalid album IDs, titles, membership, and covers fail with useful errors', () => {
  assert.throws(() => parseAlbums({}, photos), /array/);
  assert.throws(() => parseAlbums([null], photos), /Album 1/);
  for (const id of ['', 'Bad ID', 'a/b', '#anchor']) assert.throws(() => parseAlbums([{...entry, id}], photos), /id/);
  assert.throws(() => parseAlbums([entry, entry], photos), /unique/);
  assert.throws(() => parseAlbums([{...entry, title: ' '}], photos), /title/);
  assert.throws(() => parseAlbums([{...entry, description: 1}], photos), /description/);
  for (const zoomOut of ['true', 1, null]) assert.throws(() => parseAlbums([{...entry, zoomOut}], photos), /zoomOut/);
  for (const autoPan of ['false', 0, null]) assert.throws(() => parseAlbums([{...entry, autoPan}], photos), /autoPan/);
  for (const coverColumns of [0, 3, 1.5, '2', null, true]) assert.throws(() => parseAlbums([{...entry, coverColumns}], photos), /coverColumns/);
  for (const startZoom of ['2', 0, -1, 0.5, null, NaN, Infinity]) assert.throws(() => parseAlbums([{...entry, startZoom}], photos), /startZoom/);
  for (const photoIds of [[], ['missing'], ['coast', 'coast'], null]) assert.throws(() => parseAlbums([{...entry, photoIds}], photos), /photoIds/);
  assert.throws(() => parseAlbums([{...entry, coverPhotoId: 'city'}], photos), /coverPhotoId/);
  for (const highlightedPhotoIds of [null, 'coast', ['city'], ['missing'], [2], ['coast', 'coast']]) {
    assert.throws(() => parseAlbums([{...entry, highlightedPhotoIds}], photos), /highlightedPhotoIds/);
  }
});

test('manual highlights come first in configured order without bypassing filters or duplicating photos', () => {
  const [album] = parseAlbums([{...entry, photoIds: ['coast', 'city', 'forest'], highlightedPhotoIds: ['forest', 'coast']}], photos);
  const options = {tags: [], query: '', sort: 'tag-variety', showSamples: true};
  const ordered = selectPhotos(photosForAlbum(photos, album), options);
  const original = [...ordered];
  assert.deepEqual(prioritizeAlbumHighlights(ordered, album).map(photo => photo.id), ['forest', 'coast', 'city']);
  assert.deepEqual(ordered, original);
  assert.equal(prioritizeAlbumHighlights(ordered, null), ordered);
  assert.deepEqual(prioritizeAlbumHighlights(selectPhotos(photos, {...options, showSamples: false}), album).map(photo => photo.id), ['coast', 'city']);
  assert.deepEqual(prioritizeAlbumHighlights(selectPhotos(photos, {...options, tags: ['urban']}), album).map(photo => photo.id), ['city']);
  assert.deepEqual(prioritizeAlbumHighlights([], album), []);
});
