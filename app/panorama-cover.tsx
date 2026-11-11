import {useEffect, useRef, type CSSProperties} from 'react';
import assets from '../content/generated/images.json';
import type {ImageAsset} from './image-sources';
import OptimizedImage from './optimized-image';
import ProgressiveImage from './progressive-image';
import {startPanoramaMotion} from './panorama-motion';

export default function PanoramaCover({src, alt, priority = false, fullScreen = false, coverColumns = 1, autoPan = true, panStart = 1 / 3}: {src: string; alt: string; priority?: boolean; fullScreen?: boolean; coverColumns?: 1 | 2; autoPan?: boolean; panStart?: number}) {
  const viewport = useRef<HTMLDivElement>(null);
  const asset = (assets as Record<string, ImageAsset>)[src];
  const ratio = asset ? asset.width / asset.height : 3;
  const sizes = `max(${fullScreen ? 100 : 50 * coverColumns}vw, ${Math.ceil(ratio * (fullScreen ? 100 : 50))}vh)`;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let stop: (() => void) | undefined;
    function updateMotion() {
      stop?.();
      stop = undefined;
      if (autoPan && visible && !preference.matches && !document.hidden) stop = startPanoramaMotion(element!, window);
    }
    function position() {
      if (!element!.clientHeight) return;
      element!.style.setProperty('--panorama-cover-height', `${element!.clientHeight}px`);
      element!.scrollLeft = Math.max(0, element!.scrollWidth - element!.clientWidth) * panStart;
      updateMotion();
    }
    position();
    const resize = new ResizeObserver(position);
    resize.observe(element);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      updateMotion();
    });
    intersection.observe(element);
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    return () => {
      stop?.();
      resize.disconnect();
      intersection.disconnect();
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, [src, ratio, autoPan, panStart]);

  return <div ref={viewport} className="album-panorama-viewport" style={{'--panorama-cover-ratio': ratio} as CSSProperties}>
    <div className="album-panorama-image">
      {fullScreen ? <ProgressiveImage src={src} alt={alt} sizes={sizes} priority={priority}/>
        : <OptimizedImage src={src} alt={alt} sizes={sizes} priority={priority}/>}
    </div>
  </div>;
}
