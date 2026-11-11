import {useEffect, useRef} from 'react';
import OptimizedImage from './optimized-image';

export default function ZoomingAlbumCover({src, alt, priority = false, startZoom = 1, coverColumns = 1}: {src: string; alt: string; priority?: boolean; startZoom?: number; coverColumns?: 1 | 2}) {
  const viewport = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = viewport.current;
    const picture = image.current;
    if (!element || !picture) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const animation = picture.animate([{transform: `scale(${startZoom})`}, {transform: 'scale(1)'}], {
      duration: 20_000, easing: 'ease-out', fill: 'both', iterations: 1,
    });
    animation.pause();

    function updateMotion() {
      if (preference.matches) {animation.finish(); return;}
      if (animation.playState === 'finished') return;
      const preview = element!.querySelector('img');
      if (visible && !document.hidden && preview?.complete && preview.naturalWidth > 0) animation.play();
      else animation.pause();
    }
    updateMotion();
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      updateMotion();
    });
    intersection.observe(element);
    element.addEventListener('load', updateMotion, true);
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    return () => {
      animation.cancel();
      intersection.disconnect();
      element.removeEventListener('load', updateMotion, true);
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, [src, startZoom]);

  return <div ref={viewport} className="album-zoom-viewport">
    <div ref={image} className="album-zoom-image">
      <OptimizedImage src={src} alt={alt} sizes={`${50 * coverColumns * startZoom}vw`} priority={priority}/>
    </div>
  </div>;
}
