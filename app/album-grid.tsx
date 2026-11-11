import {useEffect, useRef} from 'react';
import {ArrowRight, ArrowUpRight} from 'lucide-react';
import type {Album} from './albums';
import type {Photo} from './gallery';
import OptimizedImage from './optimized-image';
import PanoramaCover from './panorama-cover';
import ZoomingAlbumCover from './zooming-album-cover';
import {SiteLinks} from './site-chrome';

export default function AlbumGrid({albums, photos, embedded = false, onOpen, onShowAll}: {
  albums: Album[]; photos: Photo[]; embedded?: boolean; onOpen?: (id: string) => void; onShowAll?: () => void;
}) {
  const explorer = useRef<HTMLElement>(null);
  const photosById = new Map(photos.map(photo => [photo.id, photo]));
  const base = import.meta.env.BASE_URL;
  const tiles: {id: string; title: string; cover: Photo; count: number; albumId: string | null; zoomOut?: boolean; startZoom?: number; coverColumns?: 1 | 2; autoPan?: boolean}[] = albums.map(album => ({id: 'album-' + album.id, title: album.title, cover: photosById.get(album.coverPhotoId)!, count: album.photoIds.length, albumId: album.id, zoomOut: album.zoomOut, startZoom: album.startZoom, coverColumns: album.coverColumns, autoPan: album.autoPan}));
  const collectionCover = photos.find(photo => !photo.sample) ?? photos[0];
  if (tiles.length < 4 && collectionCover) tiles.push({id: 'full-collection', title: 'All photographs', cover: collectionCover, count: photos.length, albumId: null});
  const Heading = embedded ? 'h2' : 'h1';

  useEffect(() => {
    const section = explorer.current;
    if (!section) return;
    const toolbar = section.querySelector<HTMLElement>('.albums-toolbar');
    function measure() {
      const available = window.innerHeight - (toolbar?.getBoundingClientRect().height ?? 0) - 2;
      section!.style.setProperty('--album-row-height', `${Math.max(1, available / 2)}px`);
    }
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (toolbar) observer?.observe(toolbar);
    window.addEventListener('resize', measure);
    return () => {observer?.disconnect(); window.removeEventListener('resize', measure);};
  }, []);

  function viewAll() {
    onShowAll?.();
    const gallery = document.getElementById('gallery');
    gallery?.focus({preventScroll: true});
    gallery?.scrollIntoView({behavior: 'instant'});
  }

  return <section ref={explorer} className="album-explorer" aria-labelledby="explore-albums-title">
    <div className="albums-toolbar">
      <Heading id="explore-albums-title">Explore albums</Heading>
      <nav className="albums-toolbar-actions" aria-label="Site navigation">
        <a className="albums-view-all" href={`${base}#gallery`} onClick={onShowAll ? event => {event.preventDefault(); viewAll();} : undefined}>All photographs <ArrowUpRight size={15} aria-hidden="true"/></a>
        <SiteLinks/>
      </nav>
    </div>
    {tiles.length ? <div className={'album-directory ' + (tiles.some(tile => tile.coverColumns === 2) ? 'album-custom-columns' : 'album-count-' + tiles.length)}>
      {tiles.map((tile, index) => <a className={'album-card' + (tile.coverColumns === 2 ? ' album-card-wide' : '')} id={tile.id} key={tile.id} href={tile.albumId ? `${base}?album=${encodeURIComponent(tile.albumId)}#gallery` : `${base}#gallery`} aria-labelledby={'card-title-' + tile.id} onClick={tile.albumId && onOpen ? event => {if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onOpen(tile.albumId!);} : !tile.albumId && onShowAll ? event => {event.preventDefault(); viewAll();} : undefined}>
        {tile.zoomOut
          ? <ZoomingAlbumCover src={tile.cover.src} alt={tile.cover.title || tile.title + ' cover'} priority={!embedded && index === 0} startZoom={tile.startZoom} coverColumns={tile.coverColumns}/>
          : tile.albumId === 'panoramas'
          ? <PanoramaCover src={tile.cover.src} alt={tile.cover.title || tile.title + ' cover'} priority={!embedded && index === 0} coverColumns={tile.coverColumns} autoPan={tile.autoPan} panStart={tile.cover.panStart}/>
          : <OptimizedImage src={tile.cover.src} alt={tile.cover.title || tile.title + ' cover'} sizes={tile.coverColumns === 2 ? '100vw' : '50vw'} priority={!embedded && index === 0}/>}
        <div className="album-card-copy">
          <h3 id={'card-title-' + tile.id}>{tile.title}</h3>
          <span className="album-card-count">{tile.count} {tile.count === 1 ? 'photograph' : 'photographs'}</span>
          <span className="album-card-action">{tile.albumId ? 'View album' : 'View all'} <ArrowRight size={16} aria-hidden="true"/></span>
        </div>
      </a>)}
    </div> : <div className="empty-state"><h3>Albums are on their way.</h3><p>New photographs will appear here soon.</p></div>}
  </section>;
}
