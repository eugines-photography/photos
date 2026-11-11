import type {Photo} from './gallery.ts';

export type Album = {
  id: string;
  title: string;
  description?: string;
  zoomOut?: boolean;
  startZoom?: number;
  coverColumns?: 1 | 2;
  autoPan?: boolean;
  coverPhotoId: string;
  photoIds: string[];
  highlightedPhotoIds?: string[];
};

export function parseAlbums(input: unknown, photos: Photo[]): Album[] {
  if (!Array.isArray(input)) throw new Error('content/albums.json must contain an array of albums.');
  const ids = new Set<string>();
  const photoIds = new Set(photos.map(photo => photo.id));
  return input.map((row, index) => {
    const fail = (message: string): never => {throw new Error(`Album ${index + 1}: ${message}`);};
    if (!row || typeof row !== 'object') return fail('expected an album object.');
    if (typeof row.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) || ids.has(row.id)) return fail('id must be a unique lowercase slug, for example city-walks.');
    ids.add(row.id);
    if (typeof row.title !== 'string' || !row.title.trim()) return fail('title must be a nonempty string.');
    if (row.description != null && typeof row.description !== 'string') return fail('description must be a string when provided.');
    if (row.zoomOut !== undefined && typeof row.zoomOut !== 'boolean') return fail('zoomOut must be true or false when provided.');
    if (row.autoPan !== undefined && typeof row.autoPan !== 'boolean') return fail('autoPan must be true or false when provided.');
    if (row.coverColumns !== undefined && row.coverColumns !== 1 && row.coverColumns !== 2) return fail('coverColumns must be 1 or 2 when provided.');
    if (row.startZoom !== undefined && (typeof row.startZoom !== 'number' || !Number.isFinite(row.startZoom) || row.startZoom < 1)) return fail('startZoom must be a finite number of at least 1 when provided.');
    if (!Array.isArray(row.photoIds) || !row.photoIds.length || row.photoIds.some((id: unknown) => typeof id !== 'string' || !photoIds.has(id))) return fail('photoIds must list existing photo IDs and contain at least one photo.');
    if (new Set(row.photoIds).size !== row.photoIds.length) return fail('photoIds must not contain duplicates.');
    if (typeof row.coverPhotoId !== 'string' || !row.photoIds.includes(row.coverPhotoId)) return fail('coverPhotoId must be one of this album’s photoIds.');
    const highlighted = row.highlightedPhotoIds === undefined ? [] : row.highlightedPhotoIds;
    if (!Array.isArray(highlighted) || highlighted.some((id: unknown) => typeof id !== 'string' || !row.photoIds.includes(id))) return fail('highlightedPhotoIds must be an array of photo IDs belonging to this album.');
    if (new Set(highlighted).size !== highlighted.length) return fail('highlightedPhotoIds must not contain duplicates.');
    return {id: row.id, title: row.title.trim(), description: (row.description ?? '').trim() || undefined, zoomOut: row.zoomOut ?? false, startZoom: row.startZoom ?? 1, coverColumns: row.coverColumns ?? 1, autoPan: row.autoPan ?? true, coverPhotoId: row.coverPhotoId, photoIds: [...row.photoIds], highlightedPhotoIds: [...highlighted]};
  });
}

export function photosForAlbum(photos: Photo[], album: Album | null): Photo[] {
  if (!album) return photos;
  const ids = new Set(album.photoIds);
  return photos.filter(photo => ids.has(photo.id));
}

export function prioritizeAlbumHighlights(photos: Photo[], album: Album | null): Photo[] {
  if (!album?.highlightedPhotoIds?.length) return photos;
  const available = new Map(photos.map(photo => [photo.id, photo]));
  const highlights = album.highlightedPhotoIds.map(id => available.get(id)).filter((photo): photo is Photo => Boolean(photo));
  const highlighted = new Set(highlights.map(photo => photo.id));
  return [...highlights, ...photos.filter(photo => !highlighted.has(photo.id))];
}
