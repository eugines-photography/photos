import {photoUrl, type Photo} from './gallery.ts';

export type ImageAsset = {
  width: number;
  height: number;
  originalBytes: number;
  variants: {src: string; width: number; height: number; bytes: number}[];
  homeVariants?: ImageAsset['variants'];
};

export function homepagePhoto(photos: Photo[], photoId: unknown): Photo | undefined {
  if (photoId === undefined) return undefined;
  if (typeof photoId !== 'string') throw new Error('content/site.json homePhotoId must be a photo ID or an empty string.');
  const id = photoId.trim();
  if (!id) return undefined;
  const photo = photos.find(photo => photo.id === id);
  if (!photo) throw new Error(`Unknown homepage photograph: ${id}. Set content/site.json homePhotoId to an ID from content/photos.json.`);
  return photo;
}

export function featuredPhotos(photos: Photo[], assets: Record<string, Pick<ImageAsset, 'width' | 'height'>>) {
  const candidates = [...photos.filter(photo => !photo.sample), ...photos.filter(photo => photo.sample)];
  return {
    landscape: candidates.find(photo => assets[photo.src]?.width > assets[photo.src]?.height) ?? candidates[0],
    portrait: candidates.find(photo => assets[photo.src]?.height > assets[photo.src]?.width) ?? candidates[0],
  };
}

export function responsiveSource(asset: ImageAsset, base = '/', maxWidth = 1600) {
  const variants = asset.variants.filter(variant => variant.width <= maxWidth);
  if (!variants.length) throw new Error('No appropriately sized preview was generated.');
  const fallback = variants.find(variant => variant.width >= 640) ?? variants.at(-1)!;
  return {
    src: photoUrl(fallback.src, base),
    srcSet: variants.map(variant => `${photoUrl(variant.src, base)} ${variant.width}w`).join(', '),
    width: asset.width,
    height: asset.height,
  };
}

export function responsiveHomepageSource(asset: ImageAsset, base = '/') {
  // Keep large homepage variants out of gallery thumbnails and album covers.
  const variants = [...asset.variants.slice(-1), ...(asset.homeVariants ?? [])];
  return responsiveSource({...asset, variants}, base, Infinity);
}

export const gallerySizes = '(max-width: 700px) 48vw, (max-width: 1050px) 32vw, 25vw';
