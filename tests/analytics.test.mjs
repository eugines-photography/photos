import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installUmami, parseUmamiConfig} from '../app/analytics.ts';

const config = {websiteId: '12345678-1234-1234-1234-123456789abc', scriptUrl: 'https://cloud.umami.is/script.js'};

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
  assert.equal(script.attributes['data-exclude-search'], undefined);
  assert.equal(script.attributes['data-auto-track'], undefined);
});
