type Viewport = Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>;
type Clock = {setTimeout: (callback: () => void, delay: number) => number; clearTimeout: (id: number) => void};
export type PanMethod = 'drag' | 'swipe' | 'wheel' | 'keyboard';
export type PanGesture = {action: 'pan'; method: PanMethod; start_percent: number; end_percent: number};

export function panoramaPosition(viewport: Viewport) {
  const range = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  return range ? Math.round(Math.max(0, Math.min(1, viewport.scrollLeft / range)) * 1000) / 10 : 0;
}

// Only explicitly initiated input arms tracking. Automatic scrolling emits nothing.
export function createPanoramaInteractions(viewport: Viewport, report: (event: PanGesture) => void, clock: Clock) {
  let timer: number | undefined;
  let gesture: {method: PanMethod; held: boolean; start: number; end: number; last: number; distance: number} | null = null;
  function flush() {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
    const finished = gesture;
    gesture = null;
    if (finished && finished.distance >= 3) report({action: 'pan', method: finished.method, start_percent: finished.start, end_percent: finished.end});
  }
  function settle() {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
    if (gesture && !gesture.held) timer = clock.setTimeout(flush, 300);
  }
  return {
    begin(method: PanMethod, held = false) {
      if (gesture && gesture.method !== method) flush();
      gesture ??= {method, held, start: panoramaPosition(viewport), end: panoramaPosition(viewport), last: viewport.scrollLeft, distance: 0};
      gesture.held = held;
      settle();
    },
    moved() {
      if (!gesture) return;
      gesture.distance += Math.abs(viewport.scrollLeft - gesture.last);
      gesture.last = viewport.scrollLeft;
      gesture.end = panoramaPosition(viewport);
      settle();
    },
    release() {if (gesture) gesture.held = false; settle();},
    flush,
  };
}
