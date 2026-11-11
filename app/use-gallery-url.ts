import {useCallback, useEffect, useRef, useState} from 'react';
import type {Photo} from './gallery';
import type {Album} from './albums';
import {createGalleryHistory, defaultGalleryState, type GalleryUrlChange, type GallerySection, type HistoryMode} from './gallery-url';

const noAlbums: Album[] = [];

export function useGalleryUrl(photos: Photo[], albums: Album[] = noAlbums) {
  // Static HTML and the first hydration render must use the same defaults.
  // Apply query parameters only after mounting to avoid hydration mismatches.
  const [state, setState] = useState(defaultGalleryState);
  const [galleryRequested, setGalleryRequested] = useState(false);
  const controller = useRef<ReturnType<typeof createGalleryHistory> | null>(null);
  const receiveState = useCallback((next: ReturnType<typeof defaultGalleryState>) => {
    setState(next);
    setGalleryRequested(window.location.hash === '#gallery');
  }, []);
  useEffect(() => {
    const history = controller.current ?? createGalleryHistory(photos, window, receiveState, albums);
    controller.current = history;
    const receiveHash = () => setGalleryRequested(window.location.hash === '#gallery');
    window.addEventListener('hashchange', receiveHash);
    return () => {
      window.removeEventListener('hashchange', receiveHash);
      history.dispose();
      if (controller.current === history) controller.current = null;
    };
  }, [photos, albums, receiveState]);
  const update = useCallback((change: GalleryUrlChange, mode: HistoryMode = 'push', section?: GallerySection) => {
    controller.current ??= createGalleryHistory(photos, window, receiveState, albums);
    controller.current.update(change, mode, section);
  }, [photos, albums, receiveState]);
  return [state, update, galleryRequested] as const;
}
