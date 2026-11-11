import type {GallerySection} from './gallery-url.ts';

export function galleryScrollTarget(url: URL): GallerySection | null {
  if (url.hash === '#albums') return 'albums';
  if (/^#album-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.hash)) return url.hash.slice(1) as GallerySection;
  if (url.hash === '#gallery' || url.searchParams.get('album')) return 'gallery';
  return null;
}

type ScrollBrowser = {
  location: Pick<Location, 'href'>;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  addEventListener: (type: 'hashchange' | 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'hashchange' | 'popstate', listener: () => void) => void;
};
type ScrollDocument = {getElementById: (id: string) => Pick<HTMLElement, 'scrollIntoView'> | null};

export function restoreGalleryScroll(browser: ScrollBrowser, document: ScrollDocument) {
  let frame: number | null = null;
  let lastDestination: string | undefined;
  function cancel() {
    if (frame !== null) browser.cancelAnimationFrame(frame);
    frame = null;
  }
  function restore() {
    const url = new URL(browser.location.href);
    const destination = `${galleryScrollTarget(url) ?? ''}:${url.searchParams.get('album') ?? ''}`;
    // Photo/history changes within the same album must not jump to its header.
    if (destination === lastDestination) return;
    lastDestination = destination;
    cancel();
    if (!galleryScrollTarget(url)) return;
    // Development pages mount on the client, after the native fragment jump.
    frame = browser.requestAnimationFrame(() => {
      frame = null;
      const target = galleryScrollTarget(new URL(browser.location.href));
      if (target) {
        const element = document.getElementById(target) ?? (target.startsWith('album-') ? document.getElementById('albums') : null);
        element?.scrollIntoView({behavior: 'instant', block: 'start'});
      }
    });
  }
  restore();
  browser.addEventListener('hashchange', restore);
  browser.addEventListener('popstate', restore);
  return () => {
    cancel();
    browser.removeEventListener('hashchange', restore);
    browser.removeEventListener('popstate', restore);
  };
}

export function restorePhotoPosition(
  browser: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame' | 'scrollTo'>,
  document: Pick<Document, 'getElementById'>,
  photoId: string,
  fallback: {left: number; top: number},
) {
  const frame = browser.requestAnimationFrame(() => {
    const card = document.getElementById('gallery-photo-' + photoId);
    if (card) {
      card.querySelector('button')?.focus({preventScroll: true});
      card.scrollIntoView({behavior: 'instant', block: 'nearest', inline: 'nearest'});
    } else {
      browser.scrollTo({...fallback, behavior: 'instant'});
    }
  });
  return () => browser.cancelAnimationFrame(frame);
}
