export type UmamiConfig = {websiteId: string; scriptUrl: string};
export type UmamiPayload = Record<string, unknown>;

// Reporting paths only: the browser continues using GitHub Pages-compatible query URLs.
export function labelGalleryPageview(type: string, payload: UmamiPayload, base: string): UmamiPayload {
  if (type !== 'event' || payload.name || typeof payload.url !== 'string') return payload;
  let url: URL;
  try {url = new URL(payload.url, 'https://gallery.invalid');} catch {return payload;}
  const prefix = base.replace(/\/$/, '') + '/';
  if (url.pathname !== prefix && url.pathname !== prefix + 'index.html') return payload;
  const album = url.searchParams.get('album');
  const photo = url.searchParams.get('photo');
  if (!album && !photo) return payload;
  let path = prefix;
  if (album) path += 'album/' + encodeURIComponent(album) + '/';
  if (photo) path += 'photo/' + encodeURIComponent(photo) + '/';
  const title = photo ? `Photo ${photo}${album ? ' · Album ' + album : ''}` : `Album ${album}`;
  url.searchParams.delete('album');
  url.searchParams.delete('photo');
  return {...payload, url: path + url.search, title};
}

export function parseUmamiConfig(input: unknown): UmamiConfig | null {
  if (input === undefined) return null;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('content/site.json umami must be an object.');
  const row = input as Record<string, unknown>;
  if (typeof row.websiteId !== 'string') throw new Error('Umami websiteId must be a string; leave it empty to disable analytics.');
  const websiteId = row.websiteId.trim();
  if (!websiteId) return null;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(websiteId)) throw new Error('Umami websiteId must be the website UUID from your tracking code.');
  if (typeof row.scriptUrl !== 'string') throw new Error('Umami scriptUrl must be the HTTPS script URL from your tracking code.');
  let url: URL;
  try {url = new URL(row.scriptUrl);} catch {throw new Error('Umami scriptUrl must be a valid HTTPS URL.');}
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Umami scriptUrl must use HTTPS without credentials.');
  return {websiteId, scriptUrl: url.href};
}

// Loaded once per document, independently of React renders and Strict Mode.
export function installUmami(config: UmamiConfig | null, document: Pick<Document, 'getElementById' | 'createElement' | 'head'>, hostname: string, production: boolean) {
  const local = /^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i.test(hostname) || hostname.toLowerCase().endsWith('.localhost');
  if (!production || local || !config || document.getElementById('umami-analytics')) return;
  const script = document.createElement('script');
  script.id = 'umami-analytics';
  script.async = true;
  script.src = config.scriptUrl;
  script.setAttribute('data-website-id', config.websiteId);
  // Keep album/photo/tag query parameters, but ignore scroll anchors.
  script.setAttribute('data-exclude-hash', 'true');
  script.setAttribute('data-before-send', 'stillframeUmamiBeforeSend');
  document.head.appendChild(script);
}
