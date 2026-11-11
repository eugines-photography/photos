import {renderToString} from 'react-dom/server';
import Gallery from '../app/page';
import About from '../app/about';
import ExploreAlbums from '../app/explore-albums';

export function render(page: 'gallery' | 'about' | 'albums') {
  return renderToString(page === 'gallery' ? <Gallery/> : page === 'albums' ? <ExploreAlbums/> : <About/>);
}
