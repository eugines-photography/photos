import {useEffect, useRef, useState} from 'react';
import assets from '../content/generated/images.json';
import {photoUrl} from './gallery';
import {watchImageReady} from './image-ready';
import {responsiveHomepageSource, type ImageAsset} from './image-sources';
import OptimizedImage from './optimized-image';

export default function ProgressiveImage({src, alt, sizes, priority = false}: {
  src: string; alt: string; sizes: string; priority?: boolean;
}) {
  const preview = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLImageElement>(null);
  const original = useRef<HTMLImageElement>(null);
  const [previewReadySrc, setPreviewReadySrc] = useState<string | null>(null);
  const [screenStatus, setScreenStatus] = useState<{src: string; ready: boolean} | null>(null);
  const [requestedSrc, setRequestedSrc] = useState<string | null>(null);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const asset = (assets as Record<string, ImageAsset>)[src];
  const hasScreenImage = Boolean(asset?.homeVariants?.length);
  const screenSource = hasScreenImage ? responsiveHomepageSource(asset, import.meta.env.BASE_URL) : null;
  const requestScreen = previewReadySrc === src && hasScreenImage;
  const screenReady = screenStatus?.src === src && screenStatus.ready;
  const canRequestOriginal = previewReadySrc === src && (!hasScreenImage || screenStatus?.src === src);

  useEffect(() => {
    const image = preview.current?.querySelector('img');
    if (!image) return;
    return watchImageReady(image, () => setPreviewReadySrc(src), () => setPreviewReadySrc(src));
  }, [src]);

  useEffect(() => {
    if (!requestScreen || !screen.current) return;
    return watchImageReady(screen.current, () => setScreenStatus({src, ready: true}), () => setScreenStatus({src, ready: false}));
  }, [src, requestScreen]);

  useEffect(() => {
    if (!canRequestOriginal) return;
    let idle: number | undefined;
    let timeout: number | undefined;
    // Start the original only after the screen-matched image has settled.
    if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(() => setRequestedSrc(src), {timeout: 1000});
    } else {
      timeout = window.setTimeout(() => setRequestedSrc(src), 100);
    }
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [src, canRequestOriginal]);

  useEffect(() => {
    if (requestedSrc !== src || !original.current) return;
    return watchImageReady(original.current, () => setReadySrc(src), () => {/* Keep the best decoded preview if the original fails. */});
  }, [src, requestedSrc]);

  return <div className={'progressive-image' + (screenReady ? ' screen-ready' : '') + (readySrc === src ? ' original-ready' : '')}>
    <div ref={preview} className="progressive-image-preview">
      <OptimizedImage src={src} alt={alt} sizes={sizes} priority={priority}/>
    </div>
    {requestScreen && screenSource && <img key={'screen-' + src} ref={screen} className="progressive-image-screen" {...screenSource} sizes={sizes} alt="" aria-hidden="true" decoding="async" fetchPriority="auto"/>}
    {requestedSrc === src && <img key={src} ref={original} className="progressive-image-original" src={photoUrl(src, import.meta.env.BASE_URL)} alt="" aria-hidden="true" decoding="async" fetchPriority="low"/>}
  </div>;
}
