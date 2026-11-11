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
  function cancel() {
    if (frame !== null) browser.cancelAnimationFrame(frame);
    frame = null;
  }
  function restore() {
    cancel();
    if (!galleryScrollTarget(new URL(browser.location.href))) return;
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
