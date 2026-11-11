import {ArrowDown} from 'lucide-react';
import site from '../content/site.json';

const base = import.meta.env.BASE_URL;

export function SiteLinks() {
  return <>
    <a className="albums-view-all" href={`${base}about.html`}>About me</a>
  </>;
}

export function SiteFooter() {
  return <footer><a className="footer-brand" href={base}>{site.name.toLowerCase()}.</a><a className="back-top" href="#" onClick={event => {event.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'});}}>Back to top <ArrowDown size={14}/></a></footer>;
}
