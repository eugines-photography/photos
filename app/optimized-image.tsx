import assets from '../content/generated/images.json';
import {responsiveSource, type ImageAsset} from './image-sources';

export default function OptimizedImage({src, alt, sizes, priority = false, thumbnail = false, landscapeSrc}: {
  src: string; alt: string; sizes: string; priority?: boolean; thumbnail?: boolean; landscapeSrc?: string;
}) {
  const images = assets as Record<string, ImageAsset>;
  const asset = images[src];
  const landscapeAsset = landscapeSrc ? images[landscapeSrc] : undefined;
  const missing = !asset ? src : landscapeSrc && !landscapeAsset ? landscapeSrc : null;
  if (missing && import.meta.env.DEV) {
    return <span className="preview-pending" role="status">Preparing photo preview…</span>;
  }
  if (missing) throw new Error(`Missing optimized photograph: ${missing}. Run npm run images.`);
  const source = responsiveSource(asset, import.meta.env.BASE_URL, thumbnail ? 960 : 1600);
  const image = <img {...source} alt={alt} sizes={sizes} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'}/>;
  if (!landscapeAsset || landscapeSrc === src) return image;
  const landscape = responsiveSource(landscapeAsset, import.meta.env.BASE_URL, thumbnail ? 960 : 1600);
  return <picture>
    <source media="(orientation: landscape)" srcSet={landscape.srcSet} sizes={sizes} width={landscape.width} height={landscape.height}/>
    {image}
  </picture>;
}
