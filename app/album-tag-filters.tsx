import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

export default function AlbumTagFilters({tags, activeTags, renderTag}: {
  tags: string[]; activeTags: string[]; renderTag: (tag: string) => ReactNode;
}) {
  const controls = useRef<HTMLDivElement>(null);
  const measurements = useRef<HTMLDivElement>(null);
  const [collapsedTags, setCollapsedTags] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const element = controls.current;
    const measure = measurements.current;
    if (!element || !measure) return;
    const row = measure.querySelector<HTMLElement>('.tag-filters')!;
    const toggle = measure.querySelector<HTMLElement>('.more-tags')!;
    function fitTags() {
      const widths = Array.from(row.children, button => button.getBoundingClientRect().width);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const controlGap = parseFloat(getComputedStyle(element!).columnGap) || 0;
      const available = element!.clientWidth;
      const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, tags.length - 1) * gap;
      let visible = tags;
      if (total > available) {
        const budget = Math.max(0, available - toggle.getBoundingClientRect().width - controlGap);
        const chosen = new Set(activeTags);
        let used = tags.reduce((sum, tag, index) => sum + (chosen.has(tag) ? widths[index] : 0), 0)
          + Math.max(0, chosen.size - 1) * gap;
        for (let index = 0; index < tags.length; index++) {
          if (chosen.has(tags[index])) continue;
          const next = widths[index] + (chosen.size ? gap : 0);
          if (used + next > budget) break;
          chosen.add(tags[index]);
          used += next;
        }
        visible = tags.filter(tag => chosen.has(tag));
      }
      setCollapsedTags(previous => previous.length === visible.length && previous.every((tag, index) => tag === visible[index]) ? previous : visible);
    }
    fitTags();
    const observer = new ResizeObserver(fitTags);
    observer.observe(element);
    let disposed = false;
    void document.fonts.ready.then(() => {if (!disposed) fitTags();});
    return () => {disposed = true; observer.disconnect();};
  }, [tags, activeTags]);

  const hasMore = collapsedTags.length < tags.length;
  return <div ref={controls} className={'tag-filter-controls album-tag-controls' + (expanded ? ' is-expanded' : '')}>
    <div id="tag-options" className="tag-filters" role="group" aria-label="Filter by tags">
      {(expanded ? tags : collapsedTags).map(renderTag)}
    </div>
    {hasMore && <button type="button" className="more-tags" aria-expanded={expanded} aria-controls="tag-options" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer tags' : 'Show more tags'}<ChevronDown size={14} aria-hidden="true"/></button>}
    <div ref={measurements} className="album-tag-measure" aria-hidden="true" inert>
      <div className="tag-filters">{tags.map(renderTag)}</div>
      <button type="button" className="more-tags" tabIndex={-1}>Show more tags<ChevronDown size={14}/></button>
    </div>
  </div>;
}
