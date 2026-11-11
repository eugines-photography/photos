import type {Photo} from './gallery.ts';
import {photosForAlbum, type Album} from './albums.ts';

export type GalleryUrlState = {
  tags: string[];
  photoId: string | null;
  query: string;
  showSamples: boolean;
  albumId: string | null;
};
export type GalleryUrlChange = Partial<GalleryUrlState> | ((state: GalleryUrlState) => Partial<GalleryUrlState>);
export type HistoryMode = 'push' | 'replace';
export type GallerySection = 'albums' | 'gallery' | `album-${string}`;

export function defaultGalleryState(): GalleryUrlState {
  return {tags: [], photoId: null, query: '', showSamples: true, albumId: null};
}

function normalize(state: GalleryUrlState, photos: Photo[], albums: Album[]): GalleryUrlState {
  const album = albums.find(album => album.id === state.albumId) ?? null;
  const knownTags = new Set(photosForAlbum(photos, album).flatMap(photo => photo.tags));
  return {
    tags: [...new Set(state.tags.map(tag => tag.trim().toLowerCase()).filter(tag => knownTags.has(tag)))],
    photoId: photos.some(photo => photo.id === state.photoId) ? state.photoId : null,
    query: state.query,
    showSamples: state.showSamples,
    albumId: albums.some(album => album.id === state.albumId) ? state.albumId : null,
  };
}

export function readGalleryUrl(url: URL, photos: Photo[], albums: Album[] = []): GalleryUrlState {
  const knownTags = new Set(photos.flatMap(photo => photo.tags));
  const values = url.searchParams.getAll('tags');
  const tags = values.flatMap(value => {
    const tag = value.trim().toLowerCase();
    // Repeated parameters also support literal tag names containing commas.
    return knownTags.has(tag) ? [tag] : tag.split(',');
  });
  return normalize({
    tags,
    photoId: url.searchParams.get('photo'),
    query: url.searchParams.get('q') ?? '',
    showSamples: !['0', 'false'].includes(url.searchParams.get('samples') ?? ''),
    albumId: url.searchParams.get('album'),
  }, photos, albums);
}

export function writeGalleryUrl(url: URL, state: GalleryUrlState, photos: Photo[], albums: Album[] = [], section?: GallerySection) {
  const next = new URL(url);
  const normalized = normalize(state, photos, albums);
  for (const key of ['tags', 'photo', 'q', 'samples', 'album']) next.searchParams.delete(key);
  for (const tag of [...normalized.tags].sort()) next.searchParams.append('tags', tag);
  if (normalized.photoId) next.searchParams.set('photo', normalized.photoId);
  if (normalized.query) next.searchParams.set('q', normalized.query);
  if (!normalized.showSamples) next.searchParams.set('samples', '0');
  if (normalized.albumId) next.searchParams.set('album', normalized.albumId);
  if (section) next.hash = section;
  return next;
}

type GalleryBrowser = {
  location: Pick<Location, 'href'>;
  history: Pick<History, 'state' | 'pushState' | 'replaceState'>;
  addEventListener: (type: 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'popstate', listener: () => void) => void;
};

// The URL is the source for browser navigation; explicit UI actions write it.
// Keeping writes out of React state updaters avoids duplicate history entries
// when Strict Mode runs an updater twice.
export function createGalleryHistory(photos: Photo[], browser: GalleryBrowser, onChange: (state: GalleryUrlState) => void, albums: Album[] = []) {
  let current = defaultGalleryState();
  let disposed = false;
  function write(state: GalleryUrlState, mode: HistoryMode, section?: GallerySection) {
    const before = new URL(browser.location.href);
    const next = writeGalleryUrl(before, state, photos, albums, section);
    if (next.href !== before.href) browser.history[mode === 'push' ? 'pushState' : 'replaceState'](browser.history.state, '', next.pathname + next.search + next.hash);
  }
  function restore() {
    if (disposed) return;
    current = readGalleryUrl(new URL(browser.location.href), photos, albums);
    write(current, 'replace');
    onChange(current);
  }
  browser.addEventListener('popstate', restore);
  restore();
  return {
    update(change: GalleryUrlChange, mode: HistoryMode = 'push', section?: GallerySection) {
      if (disposed) return;
      const patch = typeof change === 'function' ? change(current) : change;
      current = normalize({...current, ...patch}, photos, albums);
      write(current, mode, section);
      onChange(current);
    },
    dispose() {
      disposed = true;
      browser.removeEventListener('popstate', restore);
    },
  };
}
