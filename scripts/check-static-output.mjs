import {readFile, readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';

const blockedNames = /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.git|\.wrangler|\.sites-runtime|\.openai|node_modules|server)$/;
const base = (process.env.PAGES_BASE_PATH || '/').replace(/\/$/, '') + '/';
async function checkAsset(value, documentPath = '') {
  if (value.startsWith('data:') || value.startsWith('#')) return;
  const url = new URL(value, 'https://pages.test' + base + documentPath);
  if (url.origin !== 'https://pages.test' || !url.pathname.startsWith(base)) throw new Error(`Asset escapes the Pages base path: ${value}`);
  const file = join('dist', decodeURIComponent(url.pathname.slice(base.length)));
  if (!(await stat(file)).isFile()) throw new Error(`Missing built asset: ${value}`);
}
async function inspect(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (blockedNames.test(entry.name)) throw new Error(`Private or server-only output found: ${join(directory, entry.name)}`);
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in Pages output: ${path}`);
    if (entry.isDirectory()) await inspect(path);
    else if (/\.(?:js|css|html|json)$/.test(entry.name)) {
      const source = await readFile(path, 'utf8');
      if (/ADMIN_PASSWORD|ADMIN_SESSION_SECRET|\/api\/photos|\/api\/admin|cloudflare:workers|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(source)) throw new Error(`Legacy server or external font dependency in static output: ${path}`);
      if (entry.name.endsWith('.css')) {
        for (const match of source.matchAll(/url\(["']?([^"')]+)["']?\)/g)) await checkAsset(match[1], path.slice('dist/'.length));
      }
    }
  }
}
for (const entry of ['index.html', 'about.html', 'albums.html']) {
  if (!(await stat(join('dist', entry))).isFile()) throw new Error(`Missing static entrypoint: ${entry}`);
  const html = await readFile(join('dist', entry), 'utf8');
  let priorityPhotos = 0;
  if (!html.includes('<main') || !html.includes('<footer')) throw new Error(`Missing prerendered page content in ${entry}`);
  for (const tag of html.matchAll(/<(?:script|link|img|source)\b[^>]*>/gi)) {
    for (const match of tag[0].matchAll(/(?:src|href)="([^"]+)"/g)) await checkAsset(match[1], entry);
    for (const match of tag[0].matchAll(/(?:srcset|imagesrcset)="([^"]+)"/gi)) {
      for (const candidate of match[1].split(',')) await checkAsset(candidate.trim().split(/\s+/)[0], entry);
    }
    if (/^<img\b/i.test(tag[0])) {
      const image = tag[0];
      if (/\bsrc="[^"]*\/photos\//.test(image)) throw new Error(`Original photograph used as an inline image in ${entry}`);
      if (image.includes('/generated/images/')) {
        if (!/\bsrcset=/i.test(image) || !/\bwidth="\d+"/.test(image) || !/\bheight="\d+"/.test(image) || !image.includes('decoding="async"')) throw new Error(`Missing responsive image/loading attributes in ${entry}`);
        if (image.includes('fetchPriority="high"') || image.includes('fetchpriority="high"')) priorityPhotos++;
      }
    }
  }
  if (priorityPhotos > 1) throw new Error(`Too many high-priority photographs compete for bandwidth in ${entry}`);
}
await inspect('dist');
console.log(`Verified public static output and asset paths for Pages base ${base}`);
