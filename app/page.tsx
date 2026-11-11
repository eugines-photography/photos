import {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ImagePlus, X} from 'lucide-react';
import manifest from '../content/photos.json';
import albumManifest from '../content/albums.json';
import imageAssets from '../content/generated/images.json';
import site from '../content/site.json';
import {countTags, parsePhotos, selectPhotos, type Photo} from './gallery';
import {SiteFooter} from './site-chrome';
import OptimizedImage from './optimized-image';
import OriginalPhoto from './original-photo';
import PanoramaPhoto from './panorama-photo';
import PanoramaCover from './panorama-cover';
import {featuredPhotos, gallerySizes, homepagePhoto} from './image-sources';
import {useGalleryUrl} from './use-gallery-url';
import {parseAlbums, photosForAlbum, prioritizeAlbumHighlights} from './albums';
import AlbumGrid from './album-grid';
import AlbumTagFilters from './album-tag-filters';
import AlbumNavigation from './album-navigation';
import PhotoCollection from './photo-collection';
import {restoreGalleryScroll} from './gallery-scroll';
import {createViewTransitionRunner} from './view-transitions';
import type {GallerySection, GalleryUrlChange} from './gallery-url';

const photos = parsePhotos(manifest);
const albums = parseAlbums(albumManifest, photos);
const featured = featuredPhotos(photos, imageAssets);
const homePhoto = homepagePhoto(photos, site.homePhotoId);
const showPhotoIds = import.meta.env.DEV && 'showPhotoIds' in site && site.showPhotoIds === true;

export default function Gallery() {
  const [locationState, updateLocation, galleryRequested] = useGalleryUrl(photos, albums);
  const {tags: urlTags, query, showSamples, photoId, albumId} = locationState;
  const [showMoreTags, setShowMoreTags] = useState(false);
  const selected = photos.find(photo => photo.id === photoId) ?? null;
  const hasPhotoDetails = Boolean(selected?.title || selected?.description);
  const isPanorama = Boolean(selected && (albumId === 'panoramas' || selected.tags.includes('panoramas')));
  const dialog = useRef<HTMLDialogElement>(null);
  const transitions = useRef<ReturnType<typeof createViewTransitionRunner> | null>(null);
  const activeAlbum = albums.find(album => album.id === albumId) ?? null;
  const albumIndex = albums.findIndex(album => album.id === albumId);
  const previousAlbum = activeAlbum && albums.length > 1 ? albums[(albumIndex - 1 + albums.length) % albums.length] : undefined;
  const nextAlbum = activeAlbum && albums.length > 1 ? albums[(albumIndex + 1) % albums.length] : undefined;
  const albumCover = activeAlbum ? photos.find(photo => photo.id === activeAlbum.coverPhotoId) : null;
  const collection = photosForAlbum(photos, activeAlbum);
  const all = collection;
  const tagCounts = countTags(all);
  const tags = [...tagCounts.keys()];
  const activeTags = activeAlbum ? urlTags.filter(tag => tags.includes(tag)) : urlTags;
  const collapsedTags = tags.filter((tag, index) => index < 3 || activeTags.includes(tag));
  const visibleTags = showMoreTags ? tags : collapsedTags;
  const hasMoreTags = tags.length > collapsedTags.length;
  const filtered = prioritizeAlbumHighlights(selectPhotos(collection, {tags: activeTags, query, sort: activeAlbum ? 'tag-variety' : 'tag-cycle', showSamples}), activeAlbum);
  const collectionKey = JSON.stringify([albumId, [...activeTags].sort(), query, showSamples]);
  const showGallery = Boolean(activeAlbum || galleryRequested || selected || activeTags.length || query);

  function openPhoto(photo: Photo) {updateLocation({photoId: photo.id}, 'push', 'gallery');}
  function changeCollection(change: GalleryUrlChange, section: GallerySection) {
    transitions.current ??= createViewTransitionRunner(document, window);
    const target = () => document.getElementById(section) ?? document.getElementById('albums');
    transitions.current.run(() => {
      flushSync(() => updateLocation(change, 'push', section));
      // Capture the destination at its final scroll position before crossfading.
      target()?.scrollIntoView({behavior: 'instant', block: 'start'});
    }, () => {
      target()?.animate?.([{opacity: 0}, {opacity: 1}], {duration: 550, easing: 'ease-out'});
    });
  }
  function openAlbum(id: string) {
    changeCollection({albumId: id, tags: [], query: '', photoId: null, showSamples: true}, 'gallery');
  }
  function showAllPhotos() {
    changeCollection({albumId: null, tags: [], query: '', photoId: null, showSamples: true}, 'gallery');
  }
  function backToAlbums() {
    changeCollection({albumId: null, tags: [], query: '', photoId: null, showSamples: true}, activeAlbum ? `album-${activeAlbum.id}` : 'albums');
  }
  function close() {updateLocation({photoId: null});}
  function chooseTag(tag: string) {
    updateLocation(current => ({tags: current.tags.includes(tag) ? current.tags.filter(value => value !== tag) : [...current.tags, tag], photoId: null}), 'push', 'gallery');
  }
  function navigate(direction: number) {
    if (!selected || !filtered.length) return;
    const index = filtered.findIndex(photo => photo.id === selected.id);
    openPhoto(index < 0 ? filtered[direction > 0 ? 0 : filtered.length - 1] : filtered[(index + direction + filtered.length) % filtered.length]);
  }

  useEffect(() => restoreGalleryScroll(window, document), [albumId, showGallery]);
  useEffect(() => () => {transitions.current?.dispose(); transitions.current = null;}, []);

  useEffect(() => {
    if (selected) {
      dialog.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.current?.close();
      document.body.style.overflow = '';
    }
    return () => {document.body.style.overflow = '';};
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {event.preventDefault(); navigate(-1);}
      if (event.key === 'ArrowRight') {event.preventDefault(); navigate(1);}
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, filtered]);

  function tagButton(tag: string, showCount: boolean) {
    const count = tagCounts.get(tag) ?? 0;
    const label = showCount ? `${tag}, ${count} ${count === 1 ? 'photo' : 'photos'}` : tag;
    return <button className={activeTags.includes(tag) ? 'tag-pill active' : 'tag-pill'} aria-pressed={activeTags.includes(tag)} aria-label={label} key={tag} onClick={() => chooseTag(tag)} title={label}><span className="hash" aria-hidden="true">#</span><span className="tag-name">{tag}</span>{showCount && <span className="tag-count" aria-hidden="true">{count}</span>}</button>;
  }

  const galleryControls = <>
    <div className="gallery-tools">
      {activeAlbum ? <AlbumTagFilters key={activeAlbum.id} tags={tags} activeTags={activeTags} renderTag={tag => tagButton(tag, true)}/> : <div className="tag-filter-controls">
        <div id="tag-options" className={'tag-filters' + (showMoreTags || visibleTags.length > 3 ? ' expanded-selection' : '')} role="group" aria-label="Filter by tags">
          {!activeAlbum && <button className={'tag-pill all-photos' + (!activeTags.length ? ' active' : '')} aria-pressed={!activeTags.length} onClick={showAllPhotos}>All photos <span>{photos.length}</span></button>}
          {visibleTags.map(tag => tagButton(tag, true))}
        </div>
        {hasMoreTags && <button type="button" className="more-tags" aria-expanded={showMoreTags} aria-controls="tag-options" onClick={() => setShowMoreTags(value => !value)}>{showMoreTags ? 'Show fewer tags' : 'Show more tags'}<ChevronDown size={14} aria-hidden="true"/></button>}
      </div>}
    </div>
    <div className="gallery-subline">{activeTags.length > 1 && <span>Matching any of {activeTags.length} selected tags</span>}<span className="sr-only" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'photo' : 'photos'}</span></div>
  </>;

  return <>
    {!showGallery && (homePhoto || featured.portrait && featured.landscape) && <section className="home-hero" aria-labelledby="welcome-title">
        <div className="hero-photo">
          {homePhoto ? <PanoramaCover src={homePhoto.src} alt={homePhoto.title || 'Featured panorama'} panStart={homePhoto.panStart} fullScreen priority/>
            : <OptimizedImage src={featured.portrait!.src} landscapeSrc={featured.landscape!.src} alt="Featured photograph" sizes="100vw" priority/>}
        </div>
        <div className="hero-welcome">
          <h1 id="welcome-title" className="hero-title"><span>Welcome to</span>{site.name}.</h1>
        </div>
        <a className="hero-scroll" href="#albums">{albums.length ? 'Explore the albums' : 'Explore the gallery'} <ArrowDown size={16} aria-hidden="true"/></a>
    </section>}
    {!showGallery ? <main id="albums" className="albums-screen home-albums" tabIndex={-1}>
      <AlbumGrid albums={albums} photos={photos} embedded onOpen={openAlbum} onShowAll={showAllPhotos}/>
    </main> : null}
    {showGallery && <div id="gallery" className="gallery-scene" key={activeAlbum?.id ?? 'all-photos'} tabIndex={-1}>
      {activeAlbum && albumCover && <section className="album-hero" aria-labelledby="album-heading">
        <OptimizedImage src={albumCover.src} alt={albumCover.title || activeAlbum.title + ' album cover'} sizes="100vw" priority/>
        <div className="album-hero-topline">
          <a className="back-to-albums" href={`${import.meta.env.BASE_URL}#album-${activeAlbum.id}`} onClick={event => {if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); backToAlbums();}}><ArrowLeft size={16} aria-hidden="true"/> Back to albums</a>
          <span className="album-hero-meta">{all.length} {all.length === 1 ? 'photograph' : 'photographs'}</span>
        </div>
        <div className="album-hero-content">
          <div className="album-gallery-heading">
          <h1 id="album-heading">{activeAlbum.title}</h1>
          {activeAlbum.description && <p>{activeAlbum.description}</p>}
          </div>
          <div className="album-hero-filters">{galleryControls}</div>
        </div>
      </section>}
    <main>
      {!activeAlbum && <a className="back-to-albums full-gallery-back" href={`${import.meta.env.BASE_URL}#albums`} onClick={event => {if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); backToAlbums();}}><ArrowLeft size={16} aria-hidden="true"/> Back to albums</a>}
      <section className={'library' + (activeAlbum ? ' album-photo-library' : '')} aria-label="Photo library">
        {!activeAlbum && galleryControls}
        {filtered.length ? <PhotoCollection key={collectionKey} photos={filtered} paginated={Boolean(activeAlbum)} renderPhoto={(photo, index) => <article className="photo-card" key={photo.id}>
            <button onClick={() => openPhoto(photo)} aria-label={photo.title ? 'View ' + photo.title : 'View photo ' + (index + 1)}>
              <OptimizedImage src={photo.src} alt={photo.title || 'Photograph ' + (index + 1)} sizes={gallerySizes} thumbnail/>
              <div className="photo-overlay"><div>{photo.title && <h3>{photo.title}</h3>}</div><span className="expand-photo"><ArrowUpRight size={19}/></span></div>
            </button>
            <div className="photo-meta">{tags.filter(tag => photo.tags.includes(tag)).slice(0, 3).map(tag => <button key={tag} onClick={() => chooseTag(tag)}>#{tag}</button>)}</div>
            {showPhotoIds && <div className="photo-id"><span>Photo ID</span><code>{photo.id}</code></div>}
          </article>}/> : <div className="empty-state"><ImagePlus size={35}/><h3>{query || activeTags.length ? 'No moments found.' : 'The next chapter is on its way.'}</h3><p>{query || activeTags.length ? 'Try different tags or clear the filters.' : 'New photographs will appear here soon.'}</p>{(query || activeTags.length > 0) && <button className="button primary" onClick={() => updateLocation({query: '', tags: [], photoId: null})}>Clear filters</button>}</div>}
      </section>
      {activeAlbum && <AlbumNavigation album={activeAlbum} previous={previousAlbum} next={nextAlbum} photos={photos} onOpen={openAlbum} onBack={backToAlbums} onShowAll={showAllPhotos}/>}
    </main>
    </div>}
    <SiteFooter/>
    <dialog ref={dialog} className={'modal photo-modal' + (isPanorama ? ' panorama-modal' : '')} onCancel={event => {event.preventDefault(); close();}} onClick={event => {if (event.target === event.currentTarget) close();}} aria-labelledby={selected?.title ? 'dialog-title' : undefined} aria-label={selected?.title ? undefined : isPanorama ? 'Panorama viewer' : 'Photo viewer'} aria-describedby={selected?.description ? 'photo-description' : undefined}>
      {selected && <>
        <button className="close-modal" onClick={close} aria-label="Close photo"><X size={21}/></button>
        <div className={'viewer' + (hasPhotoDetails ? '' : ' viewer-image-only')}>
          <div className="viewer-image">
            {isPanorama ? <PanoramaPhoto key={selected.src} src={selected.src} alt={selected.title || 'Selected panorama'} photoId={selected.id} albumId={albumId} panStart={selected.panStart}/> : <OriginalPhoto key={selected.src} src={selected.src} alt={selected.title || 'Selected photograph'} fullWidth={!hasPhotoDetails}/>}
            <button className="prev" aria-label="Previous photo" disabled={!filtered.length || (filtered.length === 1 && filtered[0].id === selected.id)} onClick={() => navigate(-1)}><ArrowLeft size={20}/></button>
            <button className="next" aria-label="Next photo" disabled={!filtered.length || (filtered.length === 1 && filtered[0].id === selected.id)} onClick={() => navigate(1)}><ArrowRight size={20}/></button>
          </div>
          {hasPhotoDetails && <div key={selected.id} className="viewer-details">
            {selected.title && <h2 id="dialog-title">{selected.title}</h2>}
            {selected.description && <p id="photo-description" className="viewer-description">{selected.description}</p>}
          </div>}
        </div>
        {selected.tags.some(tag => !activeAlbum || tags.includes(tag)) && <div className="viewer-tags viewer-tags-footer" role="group" aria-label="Photo tags">
          {tags.filter(tag => selected.tags.includes(tag)).map(tag => tagButton(tag, false))}
        </div>}
        {showPhotoIds && <div className="photo-id viewer-photo-id"><span>Photo ID</span><code>{selected.id}</code></div>}
      </>}
    </dialog>
  </>;
}
