import site from '../content/site.json';
import {installUmami, parseUmamiConfig} from '../app/analytics';

installUmami(parseUmamiConfig('umami' in site ? site.umami : undefined), document, window.location.hostname, import.meta.env.PROD);
