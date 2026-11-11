export type UmamiConfig = {websiteId: string; scriptUrl: string};

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
  document.head.appendChild(script);
}
