import site from '../content/site.json';
import {configureAnalyticsEvents, createAnalyticsEventQueue, installUmami, labelGalleryPageview, parseUmamiConfig, type UmamiPayload, type UmamiTracker} from '../app/analytics';

declare global {
  interface Window {
    stillframeUmamiBeforeSend: (type: string, payload: UmamiPayload) => UmamiPayload;
    umami?: UmamiTracker;
  }
}

// Register before inserting the async script so the initial view is labeled too.
window.stillframeUmamiBeforeSend = (type, payload) => labelGalleryPageview(type, payload, import.meta.env.BASE_URL);

const script = installUmami(parseUmamiConfig('umami' in site ? site.umami : undefined), document, window.location.hostname, import.meta.env.PROD);
if (script) {
  const events = createAnalyticsEventQueue(() => window.umami, data => {
    // Gestures can finish while the viewer closes or switches to another photo.
    const url = new URL(import.meta.env.BASE_URL, window.location.origin);
    if (typeof data.photo_id === 'string') url.searchParams.set('photo', data.photo_id);
    if (typeof data.album_id === 'string' && data.album_id) url.searchParams.set('album', data.album_id);
    return labelGalleryPageview('event', {url: url.pathname + url.search, title: document.title}, import.meta.env.BASE_URL);
  });
  configureAnalyticsEvents(events.record);
  script.addEventListener('load', events.flush, {once: true});
  script.addEventListener('error', () => {events.clear(); configureAnalyticsEvents(() => {});}, {once: true});
}
