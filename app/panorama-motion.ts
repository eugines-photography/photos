type PanoramaViewport = Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>;
type AnimationClock = Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'>;

export function startPanoramaMotion(viewport: PanoramaViewport, clock: AnimationClock, pixelsPerSecond = 30) {
  let frame: number | null = null;
  let stopped = false;
  let previous: number | null = null;
  let position = 0;
  let direction = 1;
  let pauseUntil = 0;

  function tick(time: number) {
    if (stopped) return;
    if (previous === null) {
      // Read after the dialog's initial positioning frame has run.
      position = viewport.scrollLeft;
      previous = time;
    } else {
      const seconds = Math.min(Math.max(0, time - previous) / 1000, 0.1);
      previous = time;
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      if (maximum > 0 && time >= pauseUntil) {
        // Keep fractional progress: browsers can round scrollLeft to pixels.
        position = Math.max(0, Math.min(maximum, position + direction * pixelsPerSecond * seconds));
        viewport.scrollLeft = position;
        if (position === maximum && direction > 0) {direction = -1; pauseUntil = time + 900;}
        else if (position === 0 && direction < 0) {direction = 1; pauseUntil = time + 900;}
      }
    }
    frame = clock.requestAnimationFrame(tick);
  }

  frame = clock.requestAnimationFrame(tick);
  return () => {
    stopped = true;
    if (frame !== null) clock.cancelAnimationFrame(frame);
  };
}
