type LoadableImage = Pick<HTMLImageElement, 'complete' | 'naturalWidth' | 'decode' | 'addEventListener' | 'removeEventListener'>;

// Do not replace the preview until the original has downloaded AND decoded.
// Cleanup prevents an old request from updating a closed or changed viewer.
export function watchImageReady(image: LoadableImage, ready: () => void, failed: () => void) {
  let active = true;
  let decoding = false;
  let settled = false;
  const error = () => {
    if (active && !settled) {settled = true; failed();}
  };
  const loaded = async () => {
    if (!active || settled || decoding) return;
    decoding = true;
    try {
      await image.decode();
      if (active && !settled) {settled = true; ready();}
    } catch {error();}
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', error);
  if (image.complete) {
    if (image.naturalWidth > 0) void loaded();
    else error();
  }
  return () => {
    active = false;
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', error);
  };
}
