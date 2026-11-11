import {ArrowDown, ArrowUpRight} from 'lucide-react';
import site from '../content/site.json';

const base = import.meta.env.BASE_URL;
const repository = __GITHUB_REPOSITORY__ || site.githubRepository;
const repositoryUrl = /^[\w.-]+\/[\w.-]+$/.test(repository) ? `https://github.com/${repository}` : null;

export function SiteLinks() {
  return <>
    <a className="albums-view-all" href={`${base}about.html`}>About me</a>
    {repositoryUrl && <a className="manage-photos" href={`${repositoryUrl}/tree/HEAD/content`} target="_blank" rel="noopener noreferrer">Manage photos on GitHub <ArrowUpRight size={15}/></a>}
  </>;
}

export function SiteFooter() {
  return <footer><a className="footer-brand" href={base}>{site.name.toLowerCase()}.</a><a className="back-top" href="#" onClick={event => {event.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'});}}>Back to top <ArrowDown size={14}/></a></footer>;
}
