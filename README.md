# Stillframe

A mobile-friendly photography gallery hosted entirely on **GitHub Pages**. The application, photographs, fonts, and photo metadata are all static files. No database, external hosting account, admin password, or API token is required.

Visitors can filter by tag and open photographs at their original resolution. Only people with write access to your GitHub repository can change the collection.

The site uses a charcoal background, warm white typography, and muted sage controls. The homepage title sits at the bottom-left of its photograph, with large serif album headings throughout. Album navigation crossfades between the previous and next screens over roughly half a second in browsers supporting View Transitions; other browsers fade in the destination. Photo previews fade in only after loading and decoding, so the effect stays visible on slower connections. Reduced-motion preferences disable these transitions. All pages share the dark palette, including About Me and the viewer.

The home screen is filled edge to edge by one photograph. Set `homePhotoId` in `content/site.json` to a photo's `id` from `content/photos.json` to use that image with the same automatic panning as the Panoramas album cover. This starts at the photo's `panStart` position (one-third along the horizontal scroll range by default), reverses at the edges, pauses offscreen or in a hidden tab, and respects reduced-motion preferences. Use a wide photo for visible panning.

The configured homepage photo first displays a small optimized preview. Next, the browser chooses a sharper WebP for the full displayed panorama size and the screen's pixel density. This accounts for the panorama's displayed height and offscreen width, rather than only the viewport width. Once that image has decoded, it fades in at the same size and panning position. The original then downloads at low priority and replaces it after decoding. If either upgrade fails, the best decoded preview remains visible. Album covers continue to use small previews only.

Set `"homePhotoId": ""` or omit it to use automatic orientation selection instead: wider screens show the first landscape photo in `content/photos.json`, and taller screens show the first portrait photo. Move entries earlier in the list to change these choices. If a matching orientation is unavailable, the first photo is used instead. The image is cropped as needed to fill the screen; gallery photos keep their full aspect ratios.

Scroll down or choose **Explore the albums** to reach the Explore albums screen. It shows a full-screen 2×2 grid of clickable covers, with navigation above it. The complete gallery follows the grid.

## Define albums

After the welcome screen, visitors see a two-column album grid. Its first four covers fill the next screen, including on mobile. Add more albums to extend the same layout downward: visitors scroll naturally to see further rows. Each cover has its title and a **View album** action. When fewer than four albums are defined, an **All photographs** tile fills an additional position. Covers use optimized previews and load lazily on the homepage.

Edit `content/albums.json` to define your albums. The Landscapes, Urban, Birds, Portraits, Wildlife, and Panoramas albums use your existing photos. Each entry looks like this:

```json
{
  "id": "quiet-places",
  "title": "Quiet places",
  "description": "A collection of landscapes.",
  "zoomOut": false,
  "startZoom": 1,
  "coverColumns": 1,
  "autoPan": true,
  "coverPhotoId": "dsc-0471",
  "highlightedPhotoIds": [],
  "photoIds": ["dsc-0471", "dsc-0520"]
}
```

Use photo `id` values from `content/photos.json`. The cover must also appear in the album's `photoIds`. A photo can belong to several albums. The description is optional. Album IDs must be unique lowercase words separated by hyphens. Move entries up or down in the array to reorder the covers; use `[]` to show only the full collection tile.

Set `"coverColumns": 2` to make an album cover span both columns in the homepage's Explore albums grid, including on mobile. It keeps the same row height and supports the existing zoom-out and panorama animations. Later albums continue below in their configured order. The standalone Explore albums page uses the same setting. Set `"coverColumns": 1` or omit it for the default width.

To manually highlight photos in an album, list their IDs in `highlightedPhotoIds`, for example `"highlightedPhotoIds": ["dsc-0471", "dsc-0520"]`. These photos appear first in that exact order without a visible highlight label. All listed IDs must also belong to the album's `photoIds`, without duplicates. Highlights respect tag filters and are shown only in that album; the remaining photos keep the automatic tag-variety order. Leave the list empty or omit it to use automatic ordering throughout. The `showPhotoIds` setting in `content/site.json` can help identify photos while editing.

Set `"zoomOut": true` on an album to have its Explore albums cover slowly zoom out from its configured starting magnification to the normal fill-the-card view, then stop. The animation takes 20 seconds of visible time, pauses offscreen or in a hidden browser tab, and resumes from where it paused. The cover continues to fill the card at the end. Visitors who prefer reduced motion see the fill-the-card view immediately. Set `"zoomOut": false` (the default, also used when omitted) to disable it. On Panoramas, enabling zoom-out replaces the cover's panning effect. This setting affects only the Explore albums cover; the card's text, link, and layout stay in place.

`startZoom` controls the starting magnification when `zoomOut` is enabled. `1` stays at the normal fill-the-card view, `1.5` starts 50% closer, and `2` starts twice as close. Use a number of at least `1`; omitting the setting defaults to `1`. Values above `1` animate back to the fill-the-card view over 20 seconds.

Set `"autoPan": false` on the Panoramas album to stop automatic panning only on its Explore albums cover. Set it to `true` or omit it to enable cover panning. Opened panoramas still start panning automatically, respect reduced-motion preferences, and retain their pause/play and manual exploration controls. This album setting does not affect the homepage's main photo or the separate `zoomOut` animation.

Album membership is defined by the photo list, so changing a photo's tags does not move it between albums. Update the list when you add or remove photos. **Back to albums** returns to the homepage scrolled to the cover of the album you opened (for example `#album-portraits`). An album only displays tag filters used by its photos; unrelated tags in shared URLs are removed. The **All photos** filter is available only in the full gallery. Deselect tags to clear filters within an album.

An opened album shows its own gallery view, with the welcome screen and album grid removed. Scrolling up reaches the album header; use **Back to albums** to return to the homepage's album grid.

Albums initially show up to 12 photographs, ordered to introduce different tags and avoid repeating the previous photo's subject where possible. Tags shared by every matching photo are ignored for variety, so a shared tag such as `landscape` does not dominate the order. Ties prefer newer photos. **Show more photos** reveals the next 12 in the same order without moving the scroll position, with the album navigation available below each batch. Opening another album or changing filters starts a fresh batch. The full gallery still displays all matching photos.

Navigation below the album's photographs shows cover-photo cards for the previous and next albums in `content/albums.json` order. Navigation wraps around: the first album's previous link goes to the last album, and the last album's next link goes to the first. With only one album, these cards are hidden. They use lazy-loaded optimized previews, with the album title and photograph count overlaid. **Back to all albums** returns to this album's cover in the homepage grid, while **All photographs** opens the complete gallery. Moving to another album clears tag filters and opens its cover at the top.

The album opening uses its configured cover photo with a cinematic gradient, an oversized serif title, and the optional album description. Back to albums sits at the top-left, with the photo count at the top-right. Tag controls sit directly over the cover without an enclosing panel. The opening targets one-third of the screen height, with room to expand for text and additional tags. Its cover has a gentle entrance animation, disabled for reduced-motion preferences. Opening an album lands at this cover; its photographs follow below. The cover uses an optimized preview and never downloads the original automatically.

`albums.html` also provides the same full-screen grid as the homepage through a direct link. Cards open the selected album's photo grid. This page uses the same `content/albums.json` definitions and supports direct links on GitHub Pages.

Share an album with `?album=quiet-places#gallery`, or combine it with a photo using `?album=quiet-places&photo=dsc-0471#gallery`. Browser Back and Forward restore the album and photo selection.

## Browse photos

The gallery automatically shows two columns on mobile, three on tablets, and four on larger screens. Its masonry layout places each photograph in the shortest column so shorter photos fill the space beside taller portraits. Columns within 2 pixels of the shortest are treated as level and fill from the left, avoiding right-aligned final photos caused by tiny differences in aspect ratio. Layout updates when the screen, images, or tag labels change size. Images retain their original aspect ratios, without cropping or hover zoom.

Photos rotate through the tags in alphabetical order: one unused photo from each tag, then another round. Within each tag, newer photos come first. Photos with multiple tags appear only once, exhausted tags are skipped, and untagged photos follow the tagged collection. When filtering by several tags, the rotation uses only those selected tags.

Select several tags to show photos matching **any** selected tag. Click a selected tag again to deselect it, or choose **All photos** to clear the tag selection.

Tags appear in alphabetical order with a count of photographs carrying each tag. Counts appear only in the gallery and album filters, using the full collection in the gallery and only the current album's photos inside an album; selecting filters does not change the counts. The first three tags appear beside **All photos**. Every selected tag also stays visible there, including tags selected through shared URLs or from a photo. Extra selected tags wrap onto another row when needed. Choose **Show more tags** to reveal all tags in alphabetical order, or **Show fewer tags** to collapse them without hiding your selections. Tags beneath photos and in the photo viewer follow alphabetical order without counts.

Each album opens with its tags collapsed to the number of complete tag buttons that fit beside **Show more tags** in one row. This adjusts when the screen size changes. Selected tags remain visible; if several are selected, they can wrap. **Show more tags** reveals the album's full tag list, and **Show fewer tags** restores the compact row.

## Share tags or an opened photograph

The address bar updates as you choose tags, open a photo, move to another photo, or close the viewer. Copy the current URL to share that view. Browser Back and Forward restore earlier selections.

- `?tags=nature&tags=travel` selects both tags. The shorthand `?tags=nature,travel` also works.
- `?photo=dsc-7833` opens the photograph whose `id` in `content/photos.json` is `dsc-7833`.
- `?tags=landscape&photo=dsc-7833` combines a tag selection and an opened photo.
- `q` optionally filters photo titles and tags in shared URLs.

These query strings go after your existing gallery URL, including a repository path such as `/my-gallery/`. IDs are case-sensitive. Unknown photo IDs and tags are ignored. An explicitly linked valid photo opens even if it is outside the background gallery's current filters; closing it returns to those filters.

## Publish on GitHub

1. Create an empty GitHub repository. Use this folder's **contents as the repository root**: `package.json`, `index.html`, and `.github/` must be at the top level, not inside a second `stillframe/` folder.
2. Push the source using Git, including `.github/workflows/pages.yml`. The local `.dev.vars`, `.wrangler/`, `node_modules/`, and `dist/` directories are ignored and must not be uploaded manually.
3. In the repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
4. Open **Actions → Publish gallery to GitHub Pages → Run workflow**. Later commits to `main` publish automatically; pull requests run validation and tests without publishing.
5. Find the website URL under **Settings → Pages** or the workflow's `github-pages` deployment.

The workflow detects the Pages URL and supports both `https://USERNAME.github.io/REPOSITORY/` and root/custom-domain deployments. It publishes only `dist/` and uses GitHub's temporary built-in token. Do not create an admin password or add any deployment secrets.

The workflow assumes the publishing branch is `main`. Change the two branch filters in `.github/workflows/pages.yml` if your default branch has another name.

See the [official Vite Pages guide](https://vite.dev/guide/static-deploy#github-pages) and [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Add a photograph through GitHub

1. Add a JPG, PNG, WebP, GIF, or AVIF photograph to `public/photos/` and commit it. The gallery supports originals up to 50 MiB. GitHub's **Add file → Upload files** interface accepts files up to 25 MiB; use Git for larger originals. See [GitHub's file upload documentation](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).
2. Open `content/photos.json` and click the pencil icon to add an entry. Remember the comma between entries:

```json
{
  "id": "paris-morning",
  "title": "A morning in Paris",
  "description": "A quiet moment beneath the Eiffel Tower.",
  "src": "photos/paris-morning.jpg",
  "tags": ["paris", "architecture", "travel"],
  "date": "2026-11-06"
}
```

3. Commit the metadata change to `main`. GitHub Actions validates the photo path and metadata, then publishes the updated gallery.

Use a unique `id`, an ISO date, and a path starting with `photos/` (without a leading slash or `public/`).

To edit titles or tags, update the matching entry in `content/photos.json`. A photo may have multiple tags.

Titles are optional. Set `"title": ""` or omit the title to hide it in the gallery and photo viewer. Whitespace-only titles are also hidden.

An optional `description` appears below the title when a photo is opened. Omit it or leave it blank to hide it. Use `\n` inside the JSON string for line breaks; descriptions are displayed as plain text.

When both the title and description are blank, the viewer uses the full width for the photo and hides the sidebar. Tag buttons sit in a separate row below the photo frame. Dates are used for ordering and are not displayed in the viewer.

Photos in the Panoramas album, or tagged `panoramas`, open in a viewer that uses almost the full screen. They start at their configured `panStart` position (one-third along the horizontal scroll range by default) in **Explore panorama** mode, filling the image area's height so visitors can drag or swipe horizontally immediately. **Fit entire photo** shows the complete image. Arrow keys pan when the image area has focus. Titles and descriptions appear below the panorama, and tags stay outside the photo frame. The original loads in the background as in the standard viewer.

Add `"panStart": 0.25` to an individual photo in `content/photos.json` to start one-quarter of the way across its horizontal scroll range. Use `0` for the left edge, `0.5` for the middle, or `1` for the right edge; any number between `0` and `1` is allowed. Omitting it keeps the existing one-third starting position. The setting applies to the opened panorama and to that photo when used as a panning album cover or configured homepage photo. An album's `autoPan: false` still disables only its cover's motion; the cover remains at the photo's configured start position. Photos that fit without horizontal overflow have no distance to pan.

Explore mode slowly pans automatically, pausing briefly and reversing at each edge. Dragging, swiping, scrolling, or using the arrow keys pauses automatic motion. Use the pause/play control to stop or resume it. Automatic motion starts disabled when the visitor prefers reduced motion.

The Panoramas album cover uses the same panning speed and edge reversal while it is visible in Explore albums. It starts one-third along the scroll range, pauses offscreen or in a hidden browser tab, and stays still for visitors who prefer reduced motion. The cover remains a link to the album and uses optimized previews.

## Remove a photograph

1. Remove the photo's ID from any albums in `content/albums.json`. If it was an album cover, choose another photo in that album as the cover. Commit this change.
2. Remove its entry from `content/photos.json` and commit.
3. Delete the corresponding file from `public/photos/` and commit.

Removing the metadata first keeps every intermediate build valid.

## Configure the site

`content/site.json` contains the display name, homepage photo ID, and an optional repository name:

```json
{
  "name": "Stillframe",
  "homePhotoId": "dsc-9615-9621",
  "showPhotoIds": false,
  "githubRepository": "YOUR-USERNAME/YOUR-REPOSITORY"
}
```

During GitHub Actions builds, the repository name is detected automatically. Setting it here also enables the **Manage photos on GitHub** link in local previews. This link leads to GitHub's repository interface; visitors must have repository write permissions to edit.

Set `"showPhotoIds": true` to display each photo's metadata ID beneath gallery and album photos and below the opened photo in the viewer during local development (`npm run dev`). IDs are selectable for easy copying into `photos.json` or `albums.json`. Set it back to `false` to hide them locally. Production builds always hide these labels, including on GitHub Pages and in `npm run preview`, even if the setting is `true`. This is a code/configuration setting, with no visitor-facing toggle.

For a custom domain, configure it in **Settings → Pages** and add the domain to `public/CNAME` if required by your Pages configuration. The workflow reads the current Pages base path automatically.

## Umami analytics

The homepage, Explore albums page, and About Me page share an asynchronous Umami tracker. To activate it, add your published website in Umami and open its **Tracking code** settings. Copy the `data-website-id` value into `umami.websiteId` in `content/site.json`, and the script's `src` into `umami.scriptUrl`:

```json
"umami": {
  "websiteId": "YOUR-UMAMI-WEBSITE-ID",
  "scriptUrl": "https://cloud.umami.is/script.js"
}
```

Use the actual website UUID from Umami, not the placeholder above. For self-hosted Umami, use your own HTTPS script URL. The website ID is public tracking configuration; no Umami password or API key belongs in the site files. Leave `websiteId` empty to disable analytics.

Run `npm run build` and publish the updated site. Tracking runs only in production builds on non-localhost domains, so `npm run dev` and loopback previews do not inflate your statistics. Umami's automatic navigation tracking handles the gallery's album, photo, and tag URL changes. Before a pageview is sent, the album and photo query parameters become distinct reporting paths and titles: for example `/photos/?album=landscapes&photo=dsc-7833` is reported as `/photos/album/landscapes/photo/dsc-7833/`, titled **Photo dsc-7833 · Album landscapes**. Opening a photo from the full gallery reports `/photos/photo/dsc-7833/`. Remaining query parameters are retained, while scroll anchors such as `#albums` are excluded. Blocking the analytics script does not prevent the gallery from loading.

Look for these paths in Umami's Pages and session views to identify which photographs were opened. These are analytics-only labels, not public routes: use the normal `?album=...&photo=...` URLs to share or open a photograph. The labels apply to new visits after deployment; existing session records keep their original URLs. The hook changes existing pageview payloads without sending additional pageviews. Gallery thumbnails scrolling into view are not counted as opened photos.

Visit the published site and check your Umami dashboard to verify incoming visits. See Umami's [tracking setup](https://docs.umami.is/docs/collect-data) and [tracker configuration](https://docs.umami.is/docs/tracker-configuration).

## About Me page

The **About me** link beside **All photographs** in the Explore albums toolbar opens `about.html`. It is a separate static page that works when opened directly on GitHub Pages.

The About page uses an editorial profile layout: a large photograph on the left and an oversized introduction beside the bio and contact links. On mobile the photograph appears first. **Back to albums** and **Explore my photographs** return directly to the homepage's album section. Leave the headline blank to hide it.

Personalize the name, headline, bio paragraphs, featured photograph, and caption in `content/about.json`. The current bio is starter copy you can replace. Add an email address in `email` to show a **Get in touch** link; leave it empty to hide the link. The featured image must be a local file inside `public/photos/`, written as `photos/filename.jpg`.

Set `instagramUrl` in `content/about.json` to your full profile URL, such as `https://www.instagram.com/your_username/`, to show an Instagram link beside the other About Me actions. It opens in a new tab. Leave it empty to hide it.

## Local development

Install Node.js 22.13 or newer, then run:

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Press **Ctrl+C** to stop the server.

If using the temporary Node runtime previously downloaded on this computer:

```bash
PATH=/private/tmp/node-v22.16.0-darwin-arm64/bin:$PATH npm run dev
```

No `.env` or `.dev.vars` file is needed or loaded. Photos and metadata are edited in the same repository files locally or on GitHub.

## Loading on slow connections

Keep uploading your original photos to `public/photos/` and editing `content/photos.json` as before. GitHub Actions automatically creates WebP previews at 320, 640, 960, and 1600 pixels wide during each build. Only the configured homepage photo also gets higher-quality WebP versions at 3200, 4800, 6400, 9600, and 12000 pixels wide, limited to the source's native width. These larger versions are used only for the homepage's screen-matched upgrade. Small images are not enlarged, and camera orientation is corrected. The gallery uses previews up to 960 pixels, and the About Me page can use the larger preview. Opening a photograph shows a preview immediately while its original file loads in the background. Once the original has downloaded and decoded, it replaces the preview in the viewer. The photo grid requests only previews; the configured homepage photo also loads its original automatically. If a viewer original cannot load, its preview stays visible with a short error message.

Browsers select an appropriate preview using `srcset` and `sizes`. The home screen's featured photograph gets priority; gallery images below it use native lazy loading and asynchronous decoding. Image dimensions and the existing tile backgrounds reserve space while photos load. Preview filenames include a content hash, so replacing an image produces a fresh URL. Animated uploads have still previews; their originals play the animation when opened in the viewer.

Both pages are rendered to HTML at build time, so their content and first photo can appear before JavaScript downloads. React then activates filtering and the viewer. This is still a static GitHub Pages site: no server is deployed. The self-hosted WOFF2 fonts use `font-display: optional`, keeping text readable on a slow connection without waiting for custom fonts.

Generated previews (`public/generated/`) and image metadata (`content/generated/`) are ignored by Git. The development server generates them before serving the site and automatically refreshes them when photo files, `content/photos.json`, `content/about.json`, or `content/site.json` change. Changing `homePhotoId` regenerates the larger homepage variants for the new selection. It waits for generation to finish before reloading the gallery, so new entries never use an outdated preview manifest. You can also run `npm run images` manually; production builds always regenerate previews automatically. Removed or replaced photos have their obsolete generated previews pruned.

## Validate and preview the published files

```bash
npm test
npm run build
npm run preview
```

The build checks metadata, verifies every referenced photo exists, checks TypeScript, and verifies the static output contains no old admin/server code or private runtime files. Test a project URL locally with `PAGES_BASE_PATH=/my-gallery/ npm run build`, then open `http://localhost:5173/my-gallery/` using `npm run preview`.

## Credentials and the previous local library

The password-based admin login and Cloudflare backend have been removed. The old `.dev.vars` and `.wrangler/` directories may still exist locally; Git ignores them and they are not part of the site or the prepared upload archive. Keep them out of manual uploads as well.

Your locally uploaded Eiffel Tower photograph and its tags have been migrated into `public/photos/` and `content/photos.json`. The previous local database is preserved in its ignored runtime directory.

All gallery assets are served from GitHub Pages. Font license notices are included in `public/fonts/`.
