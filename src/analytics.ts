import site from '../content/site.json';
import {installUmami, labelGalleryPageview, parseUmamiConfig, type UmamiPayload} from '../app/analytics';

declare global {
  interface Window {
    stillframeUmamiBeforeSend: (type: string, payload: UmamiPayload) => UmamiPayload;
  }
}

// Register before inserting the async script so the initial view is labeled too.
window.stillframeUmamiBeforeSend = (type, payload) => labelGalleryPageview(type, payload, import.meta.env.BASE_URL);

installUmami(parseUmamiConfig('umami' in site ? site.umami : undefined), document, window.location.hostname, import.meta.env.PROD);
