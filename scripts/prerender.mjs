import {readFile, writeFile} from 'node:fs/promises';
import {build} from 'vite';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Render at build time only. Published Pages files need no server or API.
const output = resolve('.sites-runtime/prerender');
await build({logLevel: 'error', build: {ssr: 'src/prerender.tsx', outDir: output, emptyOutDir: true, copyPublicDir: false, rolldownOptions: {input: 'src/prerender.tsx', output: {entryFileNames: 'prerender.mjs'}}}});
const {render} = await import(pathToFileURL(resolve(output, 'prerender.mjs')).href);
for (const [entry, page] of [['index.html', 'gallery'], ['about.html', 'about'], ['albums.html', 'albums']]) {
  const path = `dist/${entry}`;
  const html = await readFile(path, 'utf8');
  if (!html.includes('<div id="root"></div>')) throw new Error(`Missing prerender target in ${entry}`);
  await writeFile(path, html.replace('<div id="root"></div>', `<div id="root">${render(page)}</div>`));
}
console.log('Prerendered gallery, Explore albums, and About Me: content and the first preview are available before JavaScript loads.');
