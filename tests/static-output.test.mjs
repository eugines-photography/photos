import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const checker = fileURLToPath(new URL('../scripts/check-static-output.mjs', import.meta.url));

test('static output distinguishes the repository prefix from original-photo paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stillframe-static-'));
  try {
    for (const folder of ['generated/images', 'photos']) {
      await mkdir(join(directory, 'dist', folder), {recursive: true});
      await writeFile(join(directory, 'dist', folder, 'photo.webp'), 'fixture');
    }
    for (const base of ['/', '/photos/', '/portfolio/']) {
      for (const relative of [false, true]) {
        for (const original of [false, true]) {
          const src = (relative ? '' : base) + (original ? 'photos/' : 'generated/images/') + 'photo.webp';
          const html = `<main><img src="${src}" srcset="${src} 640w" width="640" height="400" decoding="async"></main><footer></footer>`;
          for (const entry of ['index.html', 'about.html', 'albums.html']) {
            await writeFile(join(directory, 'dist', entry), html);
          }
          const result = spawnSync(process.execPath, [checker], {
            cwd: directory, encoding: 'utf8', env: {...process.env, PAGES_BASE_PATH: base},
          });
          assert.ifError(result.error);
          if (original) {
            assert.notEqual(result.status, 0, `Must reject original: ${src}`);
            assert.match(result.stderr, /Original photograph used as an inline image in index.html/);
          } else {
            assert.equal(result.status, 0, `Must accept preview: ${src}\n${result.stderr}`);
          }
        }
      }
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
