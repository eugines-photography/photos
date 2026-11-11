import {useCallback, useEffect, useRef, useState} from 'react';
import type {Photo} from './gallery';
import type {Album} from './albums';
import {createGalleryHistory, defaultGalleryState, type GalleryUrlChange, type GallerySection, type HistoryMode} from './gallery-url';

const noAlbums: Album[] = [];

export function useGalleryUrl(photos: Photo[], albums: Album[] = noAlbums) {
  // Static HTML and the first hydration render must use the same defaults.
  // Apply query parameters only after mounting to avoid hydration mismatches.
  const [state, setState] = useState(defaultGalleryState);
  const controller = useRef<ReturnType<typeof createGalleryHistory> | null>(null);
  useEffect(() => {
    const history = controller.current ?? createGalleryHistory(photos, window, setState, albums);
    controller.current = history;
    return () => {
      history.dispose();
      if (controller.current === history) controller.current = null;
    };
  }, [photos, albums]);
  const update = useCallback((change: GalleryUrlChange, mode: HistoryMode = 'push', section?: GallerySection) => {
    controller.current ??= createGalleryHistory(photos, window, setState, albums);
    controller.current.update(change, mode, section);
  }, [photos, albums]);
  return [state, update] as const;
}
