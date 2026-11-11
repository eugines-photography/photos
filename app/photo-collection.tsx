import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import type {Photo} from './gallery';
import PhotoMasonry from './photo-masonry';

const ALBUM_BATCH_SIZE = 12;

export default function PhotoCollection({photos, paginated, renderPhoto}: {
  photos: Photo[]; paginated: boolean; renderPhoto: (photo: Photo, index: number) => ReactNode;
}) {
  const [limit, setLimit] = useState(ALBUM_BATCH_SIZE);
  const collection = useRef<HTMLDivElement>(null);
  const reveal = useRef<{index: number; left: number; top: number} | null>(null);
  const visible = paginated ? photos.slice(0, limit) : photos;
  const hasMore = visible.length < photos.length;

  useLayoutEffect(() => {
    if (reveal.current === null) return;
    const position = reveal.current;
    const card = collection.current?.querySelectorAll<HTMLElement>('.photo-card')[position.index];
    reveal.current = null;
    card?.querySelector('button')?.focus({preventScroll: true});
    // Keep the viewport steady as the grid grows and the load-more button moves.
    window.scrollTo({left: position.left, top: position.top, behavior: 'instant'});
  }, [visible.length]);

  return <div ref={collection}>
    <div id="photo-grid"><PhotoMasonry>{visible.map(renderPhoto)}</PhotoMasonry></div>
    {paginated && <div className="album-load-more">
      <p role="status">Showing {visible.length} of {photos.length} photographs</p>
      {hasMore && <button className="button secondary" type="button" aria-controls="photo-grid" onClick={() => {reveal.current = {index: visible.length, left: window.scrollX, top: window.scrollY}; setLimit(current => current + ALBUM_BATCH_SIZE);}}>Show more photos <ChevronDown size={16} aria-hidden="true"/></button>}
    </div>}
  </div>;
}
