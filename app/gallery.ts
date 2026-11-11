export type Photo = {
  id: string;
  title: string;
  description?: string;
  panStart?: number;
  src: string;
  tags: string[];
  createdAt: number;
  sample: boolean;
};

export type GalleryOptions = {tags: string[]; query: string; sort: string; showSamples: boolean};

export function parsePhotos(input: unknown): Photo[] {
  if (!Array.isArray(input)) throw new Error('content/photos.json must contain an array of photos.');
  const ids = new Set<string>();
  return input.map((row, index) => {
    const fail = (message: string): never => {throw new Error(`Photo ${index + 1}: ${message}`);};
    if (!row || typeof row !== 'object') return fail('expected a photo object.');
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)) return fail('id must be nonempty and unique.');
    ids.add(row.id);
    if (row.title != null && typeof row.title !== 'string') return fail('title must be a string when provided.');
    if (row.description != null && typeof row.description !== 'string') return fail('description must be a string when provided.');
    if (row.panStart !== undefined && (typeof row.panStart !== 'number' || !Number.isFinite(row.panStart) || row.panStart < 0 || row.panStart > 1)) return fail('panStart must be a number from 0 (left) to 1 (right).');
    if (typeof row.src !== 'string' || !row.src.startsWith('photos/') || row.src.split('/').some((part: string) => !part || part === '.' || part === '..') || /[\\?#\x00-\x1f]/.test(row.src) || !/\.(jpe?g|png|webp|gif|avif)$/i.test(row.src)) return fail('src must be a relative image path inside public/photos (for example photos/coast.jpg).');
    if (!Array.isArray(row.tags) || row.tags.some((tag: unknown) => typeof tag !== 'string' || !tag.trim())) return fail('tags must be an array of nonempty strings.');
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(row.date) || !Number.isFinite(Date.parse(row.date))) return fail('date must be an ISO date, for example 2026-11-06.');
    if (row.sample !== undefined && typeof row.sample !== 'boolean') return fail('sample must be true or false.');
    return {id: row.id, title: (row.title ?? '').trim(), description: (row.description ?? '').trim() || undefined, panStart: row.panStart ?? 1 / 3, src: row.src, tags: [...new Set<string>(row.tags.map((tag: string) => tag.trim().toLowerCase()))], createdAt: Date.parse(row.date), sample: row.sample ?? false};
  });
}

export function photoUrl(src: string, base = '/') {
  return base.replace(/\/$/, '') + '/' + src.split('/').map(encodeURIComponent).join('/');
}

export function countTags(photos: Photo[]) {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    for (const tag of photo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return new Map([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

function cycleByTag(photos: Photo[], selectedTags: string[]) {
  // Use a stable alphabetical order. Each tag has its own cursor so a photo
  // with several tags can be skipped efficiently once another tag shows it.
  const tagOrder = [...new Set(selectedTags.length ? selectedTags : photos.flatMap(photo => photo.tags))].sort();
  const buckets = tagOrder.map(tag => ({photos: photos.filter(photo => photo.tags.includes(tag)), cursor: 0}));
  const seen = new Set<string>();
  const ordered: Photo[] = [];
  let added: boolean;
  do {
    added = false;
    for (const bucket of buckets) {
      while (bucket.cursor < bucket.photos.length && seen.has(bucket.photos[bucket.cursor].id)) bucket.cursor++;
      if (bucket.cursor === bucket.photos.length) continue;
      const photo = bucket.photos[bucket.cursor++];
      seen.add(photo.id);
      ordered.push(photo);
      added = true;
    }
  } while (added);
  // Keep untagged photos visible too, after the tag rotation is exhausted.
  return [...ordered, ...photos.filter(photo => !seen.has(photo.id))];
}

function varyByTag(photos: Photo[]) {
  const informative = new Set([...countTags(photos)].filter(([, count]) => count < photos.length).map(([tag]) => tag));
  if (!informative.size) return photos;
  const remaining = photos.map(photo => ({photo, tags: photo.tags.filter(tag => informative.has(tag))}));
  const uses = new Map<string, number>();
  let previous = new Set<string>();
  const ordered: Photo[] = [];
  while (remaining.length) {
    let best = 0;
    let bestScore = [Infinity, Infinity, Infinity];
    remaining.forEach((candidate, index) => {
      const counts = candidate.tags.map(tag => uses.get(tag) ?? 0);
      const score = counts.length ? [Math.min(...counts), candidate.tags.filter(tag => previous.has(tag)).length, counts.reduce((sum, count) => sum + count, 0) / counts.length] : [Infinity, Infinity, Infinity];
      const difference = score.findIndex((value, position) => value !== bestScore[position]);
      if (difference >= 0 && score[difference] < bestScore[difference]) {best = index; bestScore = score;}
    });
    const [chosen] = remaining.splice(best, 1);
    ordered.push(chosen.photo);
    chosen.tags.forEach(tag => uses.set(tag, (uses.get(tag) ?? 0) + 1));
    previous = new Set(chosen.tags);
  }
  return ordered;
}

export function selectPhotos(photos: Photo[], options: GalleryOptions) {
  const query = options.query.trim().toLowerCase();
  const filtered = photos.filter(photo =>
    (options.showSamples || !photo.sample) &&
    (!options.tags.length || options.tags.some(tag => photo.tags.includes(tag))) &&
    (!query || [photo.title, ...photo.tags].some(value => value.toLowerCase().includes(query)))
  ).sort((a, b) => options.sort === 'title' ? a.title.localeCompare(b.title) : options.sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  return options.sort === 'tag-variety' ? varyByTag(filtered) : options.sort === 'tag-cycle' ? cycleByTag(filtered, options.tags) : filtered;
}
