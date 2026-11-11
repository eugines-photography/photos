import {useLayoutEffect, useRef, type ReactNode} from 'react';
import {masonryLayout} from './masonry-layout';

export default function PhotoMasonry({children}: {children: ReactNode}) {
  const container = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const cards = Array.from(element.children) as HTMLElement[];
    let frame: number | null = null;
    let disposed = false;
    function layout() {
      if (!element || element.clientWidth <= 0) return;
      const style = getComputedStyle(element);
      const columns = Math.max(1, parseInt(style.getPropertyValue('--gallery-columns')) || 2);
      const columnGap = parseFloat(style.columnGap) || 0;
      const rowGap = parseFloat(style.rowGap) || 0;
      const columnWidth = (element.clientWidth - columnGap * (columns - 1)) / columns;
      element.classList.add('is-positioned');
      for (const card of cards) card.style.width = `${columnWidth}px`;
      // Images reserve their natural aspect ratios before their previews load.
      const heights = cards.map(card => card.getBoundingClientRect().height);
      const result = masonryLayout(heights, columns, columnWidth, columnGap, rowGap);
      cards.forEach((card, index) => {
        card.style.left = `${result.positions[index].left}px`;
        card.style.top = `${result.positions[index].top}px`;
      });
      element.style.height = `${result.height}px`;
    }
    function schedule() {
      if (disposed || frame !== null) return;
      frame = requestAnimationFrame(() => {frame = null; layout();});
    }
    layout();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    cards.forEach(card => observer.observe(card));
    window.addEventListener('resize', schedule);
    void document.fonts.ready.then(schedule);
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      element.classList.remove('is-positioned');
      element.style.removeProperty('height');
      for (const card of cards) {
        card.style.removeProperty('width');
        card.style.removeProperty('left');
        card.style.removeProperty('top');
      }
    };
  }, [children]);

  return <div ref={container} className="masonry">{children}</div>;
}
