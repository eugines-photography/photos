import type {MouseEvent} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, LayoutGrid} from 'lucide-react';
import type {Album} from './albums';
import type {Photo} from './gallery';
import OptimizedImage from './optimized-image';

export default function AlbumNavigation({album, previous, next, photos, onOpen, onBack, onShowAll}: {
  album: Album; previous?: Album; next?: Album; photos: Photo[];
  onOpen: (id: string) => void; onBack: () => void; onShowAll: () => void;
}) {
  const base = import.meta.env.BASE_URL;
  function navigate(action: () => void) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      action();
    };
  }
  const albumUrl = (id: string) => `${base}?album=${encodeURIComponent(id)}#gallery`;
  const single = !previous || !next;
  function albumCard(target: Album, direction: 'prev' | 'next') {
    const cover = photos.find(photo => photo.id === target.coverPhotoId);
    const label = direction === 'prev' ? 'Previous album' : 'Next album';
    return <a className="album-nav-card" href={albumUrl(target.id)} rel={direction} onClick={navigate(() => onOpen(target.id))} aria-label={`${label}: ${target.title}`}>
      {cover && <OptimizedImage src={cover.src} alt="" sizes={single ? '(max-width: 740px) 96vw, 700px' : '48vw'} thumbnail/>}
      <span className="album-nav-direction" aria-hidden="true">{direction === 'prev' ? <ArrowLeft size={19}/> : <ArrowRight size={19}/>}</span>
      <span className="album-nav-copy"><small>{label}</small><strong>{target.title}</strong><span>{target.photoIds.length} {target.photoIds.length === 1 ? 'photograph' : 'photographs'}</span></span>
    </a>;
  }

  return <nav className="album-bottom-navigation" aria-label="Album navigation">
    {(previous || next) && <>
      <h2 className="album-navigation-title">More to explore</h2>
      <div className={'album-adjacent-links' + (single ? ' single-album' : '')}>
        {previous && albumCard(previous, 'prev')}
        {next && albumCard(next, 'next')}
      </div>
    </>}
    <div className="album-navigation-links">
      <a href={`${base}#album-${album.id}`} onClick={navigate(onBack)}><LayoutGrid size={16} aria-hidden="true"/> Back to all albums</a>
      <a href={`${base}#gallery`} onClick={navigate(onShowAll)}>All photographs <ArrowUpRight size={16} aria-hidden="true"/></a>
    </div>
  </nav>;
}
