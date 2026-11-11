export function masonryLayout(heights: number[], columns: number, columnWidth: number, columnGap: number, rowGap: number) {
  const bottoms = Array<number>(columns).fill(0);
  const positions = heights.map(height => {
    // Tiny aspect-ratio and rounding differences should not send a new row right.
    const shortest = Math.min(...bottoms);
    const column = bottoms.findIndex(bottom => bottom <= shortest + 2);
    const position = {left: column * (columnWidth + columnGap), top: bottoms[column]};
    bottoms[column] += height + rowGap;
    return position;
  });
  return {positions, height: heights.length ? Math.max(...bottoms) - rowGap : 0};
}
