import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAnalyticsEventQueue, installUmami, labelGalleryPageview, parseUmamiConfig} from '../app/analytics.ts';

const config = {websiteId: '12345678-1234-1234-1234-123456789abc', scriptUrl: 'https://cloud.umami.is/script.js'};

test('early interaction events retain their original photo context when Umami loads later', () => {
  let tracker;
  let currentUrl = '/photos/photo/one/';
  const sent = [];
  const events = createAnalyticsEventQueue(() => tracker, () => ({url: currentUrl, title: 'Original photo'}));
  const data = {photo_id: 'one', album_id: 'panoramas', action: 'fit'};
  events.record('panorama_interaction', data);
  currentUrl = '/photos/photo/two/';
  data.photo_id = 'two';
  tracker = {track(callback) {sent.push(callback({website: config.websiteId, url: currentUrl}));}};
  events.flush();
  events.flush();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].name, 'panorama_interaction');
  assert.equal(sent[0].url, '/photos/photo/one/');
  assert.equal(sent[0].data.photo_id, 'one');
  assert.equal(sent[0].website, config.websiteId);
  assert.equal(typeof sent[0].timestamp, 'number');
});

test('event buffering is bounded and blocked or failing analytics cannot break interaction handlers', async () => {
  let tracker;
  const sent = [];
  const events = createAnalyticsEventQueue(() => tracker, () => ({url: '/'}));
  for (let n = 0; n < 70; n++) events.record('panorama_interaction', {n});
  tracker = {track(callback) {sent.push(callback({}));}};
  events.flush();
  assert.equal(sent.length, 50);
  assert.equal(sent[0].data.n, 20);
  tracker = {track() {throw new Error('blocked');}};
  assert.doesNotThrow(() => events.record('panorama_interaction', {}));
  tracker = {track() {return Promise.reject(new Error('offline'));}};
  events.record('panorama_interaction', {});
  await new Promise(resolve => setImmediate(resolve));
  tracker = undefined;
  events.record('panorama_interaction', {});
  events.clear();
  tracker = {track() {assert.fail('cleared events must not be sent');}};
  events.flush();
});

function fakeDocument() {
  const scripts = [];
  return {
    scripts,
    getElementById: id => scripts.find(script => script.id === id),
    createElement: name => {
      assert.equal(name, 'script');
      return {attributes: {}, setAttribute(key, value) {this.attributes[key] = value;}};
    },
    head: {appendChild: script => scripts.push(script)},
  };
}

test('analytics is optional and accepts cloud or self-hosted HTTPS trackers', () => {
  assert.equal(parseUmamiConfig(undefined), null);
  assert.equal(parseUmamiConfig({...config, websiteId: ' '}), null);
  assert.deepEqual(parseUmamiConfig(config), config);
  assert.equal(parseUmamiConfig({...config, scriptUrl: 'https://analytics.example.com/script.js'}).scriptUrl, 'https://analytics.example.com/script.js');
  for (const input of [null, [], 'script', {...config, websiteId: 5}, {...config, websiteId: 'replace-me'}, {...config, scriptUrl: 'javascript:alert(1)'}, {...config, scriptUrl: 'https://user:password@example.com/script.js'}]) {
    assert.throws(() => parseUmamiConfig(input), /umami/i);
  }
});

test('analytics never loads without configuration, in development, or on loopback previews', () => {
  const document = fakeDocument();
  installUmami(null, document, 'photos.example.com', true);
  installUmami(config, document, 'photos.example.com', false);
  for (const hostname of ['localhost', '127.0.0.1', '127.0.1.1', '[::1]', '::1', 'photos.localhost']) {
    installUmami(config, document, hostname, true);
  }
  assert.equal(document.scripts.length, 0);
});

test('published pages load one nonblocking tracker with query tracking and no scroll anchors', () => {
  const document = fakeDocument();
  installUmami(config, document, 'photos.example.com', true);
  installUmami(config, document, 'photos.example.com', true);
  assert.equal(document.scripts.length, 1);
  const [script] = document.scripts;
  assert.equal(script.src, config.scriptUrl);
  assert.equal(script.async, true);
  assert.equal(script.attributes['data-website-id'], config.websiteId);
  assert.equal(script.attributes['data-exclude-hash'], 'true');
  assert.equal(script.attributes['data-before-send'], 'stillframeUmamiBeforeSend');
  assert.equal(script.attributes['data-exclude-search'], undefined);
  assert.equal(script.attributes['data-auto-track'], undefined);
});

test('album and opened photo pageviews get distinct paths and titles on root and project sites', () => {
  for (const base of ['/', '/photos/']) {
    const original = {url: `${base}?album=landscapes&photo=dsc-7833#gallery`, title: 'Photography', website: config.websiteId};
    const labeled = labelGalleryPageview('event', original, base);
    assert.equal(labeled.url, `${base}album/landscapes/photo/dsc-7833/`);
    assert.equal(labeled.title, 'Photo dsc-7833 · Album landscapes');
    assert.equal(labeled.website, config.websiteId);
    assert.equal(original.url, `${base}?album=landscapes&photo=dsc-7833#gallery`);
    assert.equal(labelGalleryPageview('event', {url: `${base}?album=landscapes`}, base).url, `${base}album/landscapes/`);
    assert.equal(labelGalleryPageview('event', {url: `${base}index.html?photo=dsc-7833`}, base).url, `${base}photo/dsc-7833/`);
    assert.equal(labelGalleryPageview('event', {url: `${base}?photo=dsc-0471`}, base).url, `${base}photo/dsc-0471/`);
  }
});

test('reporting preserves filters, encodes IDs, and leaves other pages and named events alone', () => {
  const result = labelGalleryPageview('event', {url: '/photos/?photo=photo%2Fone&tags=nature&tags=travel'}, '/photos/');
  assert.equal(result.url, '/photos/photo/photo%2Fone/?tags=nature&tags=travel');
  for (const url of ['/photos/', '/photos/about.html', '/photos/albums.html', '/elsewhere/?photo=one']) {
    const payload = {url, title: 'Existing title'};
    assert.equal(labelGalleryPageview('event', payload, '/photos/'), payload);
  }
  const custom = {url: '/photos/?photo=one', name: 'custom event'};
  assert.equal(labelGalleryPageview('event', custom, '/photos/'), custom);
  const session = {url: '/photos/?photo=one'};
  assert.equal(labelGalleryPageview('identify', session, '/photos/'), session);
  assert.deepEqual(labelGalleryPageview('event', {}, '/photos/'), {});
});
