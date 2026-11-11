import {useEffect, useRef, useState} from 'react';
import {photoUrl} from './gallery';
import {watchImageReady} from './image-ready';
import OptimizedImage from './optimized-image';

export default function OriginalPhoto({src, alt, fullWidth = false, panorama = false}: {src: string; alt: string; fullWidth?: boolean; panorama?: boolean}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewReady, setPreviewReady] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const original = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = preview.current?.querySelector('img');
    if (!image) return;
    return watchImageReady(image, () => setPreviewReady(true), () => setPreviewReady(true));
  }, []);
  useEffect(() => {
    if (!original.current) return;
    return watchImageReady(original.current, () => setStatus('ready'), () => setStatus('error'));
  }, []);

  return <div className={'viewer-photo' + (previewReady ? ' preview-ready' : '') + (status === 'ready' ? ' original-ready' : '')}>
    <div ref={preview} className="viewer-photo-preview" aria-hidden={status === 'ready'}>
      <OptimizedImage src={src} alt={alt} sizes={panorama ? '98vw' : fullWidth ? '(max-width: 1120px) 96vw, 1120px' : '(max-width: 700px) 94vw, (max-width: 1120px) 60vw, 700px'} priority thumbnail={!panorama}/>
    </div>
    <img ref={original} className="viewer-original" src={photoUrl(src, import.meta.env.BASE_URL)} alt={alt} aria-hidden={status !== 'ready'} loading="eager" decoding="async"/>
    <span className={status === 'ready' ? 'sr-only' : 'viewer-load-status'} role="status">
      {status === 'ready' ? 'Full-resolution photo loaded.' : status === 'error' ? 'Original couldn’t load. Showing preview.' : 'Loading full-resolution photo…'}
    </span>
  </div>;
}
