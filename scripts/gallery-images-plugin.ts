import {execFile} from 'node:child_process';
import {relative, resolve, sep} from 'node:path';
import {promisify} from 'node:util';
import type {Plugin} from 'vite';

const exec = promisify(execFile);

export function isGalleryImageSource(root: string, file: string) {
  const path = relative(root, resolve(file)).split(sep).join('/');
  return path === 'content/photos.json' || path === 'content/about.json' || path === 'content/site.json' ||
    (path.startsWith('public/photos/') && /\.(jpe?g|png|webp|gif|avif)$/i.test(path));
}

// Coalesce a burst of file events and serialize edits arriving during a run.
export function createImageQueue(run: () => Promise<void>, delay = 100) {
  let tail = Promise.resolve();
  let scheduled: Promise<void> | null = null;
  return {
    request() {
      if (scheduled) return scheduled;
      const job = tail.catch(() => {}).then(async () => {
        if (delay) await new Promise(done => setTimeout(done, delay));
        scheduled = null;
        await run();
      });
      scheduled = job;
      tail = job;
      return job;
    },
    async idle() {
      let job: Promise<void>;
      do {job = tail; await job;} while (job !== tail);
    },
  };
}

export function galleryImagesPlugin(): Plugin {
  let root = '';
  let queue: ReturnType<typeof createImageQueue> | undefined;
  return {
    name: 'stillframe-gallery-images',
    apply: 'serve',
    enforce: 'pre',
    configResolved(config) {root = config.root;},
    async configureServer(server) {
      let disposed = false;
      const abort = new AbortController();
      queue = createImageQueue(async () => {
        if (disposed) return;
        try {
          const {stdout} = await exec(process.execPath, [resolve(root, 'scripts/prepare-images.mjs')], {cwd: root, signal: abort.signal});
          if (disposed) return;
          if (stdout.trim()) server.config.logger.info(stdout.trim());
          server.ws.send({type: 'full-reload'});
        } catch (error) {
          if (!disposed) server.config.logger.error(`[gallery images] ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      });
      const currentQueue = queue;
      // Hold page/module requests until source metadata and generated metadata
      // agree, including a manual refresh in the middle of image generation.
      server.middlewares.use((_request, response, next) => {
        void currentQueue.idle().then(() => next(), () => {
          response.statusCode = 503;
          response.end('Photo previews could not be refreshed. Check the development terminal.');
        });
      });
      const changed = (event: string, file: string) => {
        if (!disposed && ['add', 'change', 'unlink'].includes(event) && isGalleryImageSource(root, file)) {
          void currentQueue.request().catch(() => {});
        }
      };
      server.watcher.on('all', changed);
      server.httpServer?.once('close', () => {
        disposed = true;
        abort.abort();
        server.watcher.off('all', changed);
      });
      await currentQueue.request();
    },
    async handleHotUpdate(context) {
      const generated = resolve(root, 'content/generated/images.json');
      if (context.file === generated || isGalleryImageSource(root, context.file)) {
        for (const module of context.modules) context.server.moduleGraph.invalidateModule(module);
        if (context.file !== generated) await queue?.request();
        // The generator sends one full refresh after all previews are ready.
        return [];
      }
    },
  };
}
