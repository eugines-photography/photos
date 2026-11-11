type Transition = Pick<ViewTransition, 'ready' | 'finished' | 'skipTransition'>;
type TransitionDocument = {startViewTransition?: (update: () => void) => Transition};
type MotionBrowser = {matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>};

export function createViewTransitionRunner(document: TransitionDocument, browser: MotionBrowser) {
  let active: Transition | null = null;
  let revision = 0;
  return {
    run(update: () => void, fallback: () => void) {
      const current = ++revision;
      active?.skipTransition();
      active = null;
      let committed = false;
      const commit = () => {
        if (committed || current !== revision) return;
        committed = true;
        update();
      };
      if (browser.matchMedia('(prefers-reduced-motion: reduce)').matches) {commit(); return;}
      if (typeof document.startViewTransition !== 'function') {commit(); fallback(); return;}
      try {
        const transition = document.startViewTransition(commit);
        active = transition;
        void transition.ready.catch(() => {});
        void transition.finished.catch(() => {}).finally(() => {if (active === transition) active = null;});
      } catch {
        commit();
        fallback();
      }
    },
    dispose() {revision++; active?.skipTransition(); active = null;},
  };
}
