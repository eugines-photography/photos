import albumManifest from '../content/albums.json';
import photoManifest from '../content/photos.json';
import {parseAlbums} from './albums';
import {parsePhotos} from './gallery';
import AlbumGrid from './album-grid';
import {SiteFooter} from './site-chrome';

const photos = parsePhotos(photoManifest);
const albums = parseAlbums(albumManifest, photos);

export default function ExploreAlbums() {
  return <div className="albums-page">
    <div className="albums-screen">
      <main className="albums-main"><AlbumGrid albums={albums} photos={photos}/></main>
    </div>
    <SiteFooter/>
  </div>;
}
