import {ArrowLeft, ArrowRight, ArrowUpRight, Mail} from 'lucide-react';
import about from '../content/about.json';
import OptimizedImage from './optimized-image';
import {SiteFooter} from './site-chrome';

export default function About() {
  const headline = 'headline' in about && typeof about.headline === 'string' ? about.headline.trim() : '';
  const rawInstagram = about.instagramUrl.trim();
  const instagramUrl = rawInstagram && (/^https?:\/\//i.test(rawInstagram) ? rawInstagram : `https://${rawInstagram}`);
  const albumsUrl = `${import.meta.env.BASE_URL}#albums`;
  return <div className="about-page">
    <main className="about-main">
      <nav className="about-navigation" aria-label="About page navigation"><a href={albumsUrl}><ArrowLeft size={16} aria-hidden="true"/>Back to albums</a></nav>
      <section className="about-layout" aria-labelledby="about-title">
        <figure className="about-photo">
          <div className="about-photo-frame"><OptimizedImage src={about.image} alt={about.imageAlt} sizes="(max-width: 740px) 92vw, (max-width: 1400px) 47vw, 680px" priority/></div>
          {'imageCaption' in about && typeof about.imageCaption === 'string' && about.imageCaption && <figcaption>{about.imageCaption}</figcaption>}
        </figure>
        <div className="about-copy">
          <span className="eyebrow"><span/>ABOUT ME</span>
          <h1 id="about-title"><span className="about-greeting">Hi, I’m</span><em>{about.name}<span className="about-name-dot">.</span></em></h1>
          {headline && <h2>{headline}</h2>}
          <div className="about-bio">{about.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <div className="about-actions">
            {(instagramUrl || about.email) && <div className="about-contact-links">
              {about.email && <a className="about-contact" href={`mailto:${about.email}`}><Mail size={17} aria-hidden="true"/>Get in touch<ArrowUpRight size={14} aria-hidden="true"/></a>}
              {instagramUrl && <a className="about-contact about-instagram" href={instagramUrl} target="_blank" rel="noopener noreferrer"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>Instagram<ArrowUpRight size={14} aria-hidden="true"/></a>}
            </div>}
            <a className="about-gallery-link" href={albumsUrl}>Explore my photographs <ArrowRight size={17} aria-hidden="true"/></a>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </div>;
}
