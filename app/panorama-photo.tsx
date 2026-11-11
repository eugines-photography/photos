import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Maximize2, Minimize2, Pause, Play} from 'lucide-react';
import assets from '../content/generated/images.json';
import type {ImageAsset} from './image-sources';
import OriginalPhoto from './original-photo';
import {startPanoramaMotion} from './panorama-motion';
import {trackAnalyticsEvent} from './analytics';
import {createPanoramaInteractions, panoramaPosition} from './panorama-interactions';

export default function PanoramaPhoto({src, alt, photoId, albumId, panStart = 1 / 3}: {src: string; alt: string; photoId: string; albumId: string | null; panStart?: number}) {
  const [panning, setPanning] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{pointerId: number; x: number; left: number} | null>(null);
  const interactions = useRef<ReturnType<typeof createPanoramaInteractions> | null>(null);
  const asset = (assets as Record<string, ImageAsset>)[src];
  const style = {'--panorama-ratio': asset ? asset.width / asset.height : 3} as CSSProperties;

  useEffect(() => {
    if (!panning || !viewport.current) return;
    const tracker = createPanoramaInteractions(viewport.current, event => {
      trackAnalyticsEvent('panorama_interaction', {photo_id: photoId, album_id: albumId ?? '', ...event});
    }, window);
    interactions.current = tracker;
    return () => {tracker.flush(); if (interactions.current === tracker) interactions.current = null;};
  }, [panning, photoId, albumId]);

  function reportControl(action: 'pause' | 'resume' | 'fit' | 'explore') {
    interactions.current?.flush();
    trackAnalyticsEvent('panorama_interaction', {photo_id: photoId, album_id: albumId ?? '', action, position_percent: viewport.current ? panoramaPosition(viewport.current) : 0});
  }

  useEffect(() => {
    // The parent opens the dialog after mounting; wait for its visible layout.
    const frame = requestAnimationFrame(() => {
      const element = viewport.current;
      if (!element) return;
      element.scrollLeft = panning ? Math.max(0, element.scrollWidth - element.clientWidth) * panStart : 0;
      if (panning) element.focus({preventScroll: true});
    });
    return () => cancelAnimationFrame(frame);
  }, [panning, panStart]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {if (preference.matches) setAutomatic(false);};
    changed();
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    if (panning && automatic && viewport.current) return startPanoramaMotion(viewport.current, window);
  }, [panning, automatic, panStart]);

  return <div className="panorama-photo" style={style}>
    <div className="panorama-toolbar">
      <span>Panorama</span>
      <div className="panorama-actions">
      {panning && <button className="panorama-motion-toggle" type="button" aria-label={automatic ? 'Pause automatic panning' : 'Resume automatic panning'} title={automatic ? 'Pause automatic panning' : 'Resume automatic panning'} onClick={() => {reportControl(automatic ? 'pause' : 'resume'); setAutomatic(value => !value);}}>{automatic ? <Pause size={15} aria-hidden="true"/> : <Play size={15} aria-hidden="true"/>}</button>}
      <button className="panorama-toggle" type="button" aria-pressed={panning} onClick={() => {reportControl(panning ? 'fit' : 'explore'); if (!panning) setAutomatic(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); setPanning(value => !value);}}>
        {panning ? <Minimize2 size={15} aria-hidden="true"/> : <Maximize2 size={15} aria-hidden="true"/>}
        {panning ? 'Fit entire photo' : 'Explore panorama'}
      </button>
      </div>
    </div>
    <div ref={viewport} className={'panorama-viewport' + (panning ? ' is-panning' : '') + (dragging ? ' is-dragging' : '')} role="region" aria-label="Panorama image" tabIndex={panning ? 0 : undefined}
      onPointerDown={event => {
        if (panning) setAutomatic(false);
        if (panning && (event.pointerType !== 'mouse' || event.button === 0)) interactions.current?.begin(event.pointerType === 'mouse' ? 'drag' : 'swipe', true);
        if (!panning || event.pointerType !== 'mouse' || event.button !== 0) return;
        drag.current = {pointerId: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft};
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        setDragging(true);
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId === event.pointerId) {
          event.currentTarget.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
          interactions.current?.moved();
        }
      }}
      onPointerUp={event => {
        interactions.current?.release();
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {interactions.current?.release(); drag.current = null; setDragging(false);}}
      onLostPointerCapture={() => {interactions.current?.release(); drag.current = null; setDragging(false);}}
      onScroll={() => interactions.current?.moved()}
      onWheel={() => {if (panning) {interactions.current?.begin('wheel'); setAutomatic(false);}}}
      onKeyDown={event => {
        if (panning && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          interactions.current?.begin('keyboard');
          setAutomatic(false);
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.scrollLeft += (event.key === 'ArrowRight' ? 1 : -1) * event.currentTarget.clientWidth / 5;
          interactions.current?.moved();
        }
      }}>
      <OriginalPhoto src={src} alt={alt} fullWidth panorama/>
    </div>
    <p className="panorama-hint" aria-live="polite">{panning ? automatic ? 'Slowly panning · drag or swipe to take control.' : 'Drag or swipe sideways to explore.' : 'Explore panorama to look closer.'}<span className="sr-only"> In explore mode, focus the image and use the left and right arrow keys to pan.</span></p>
  </div>;
}
