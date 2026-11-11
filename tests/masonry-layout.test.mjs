import {test} from 'node:test';
import assert from 'node:assert/strict';
import {masonryLayout} from '../app/masonry-layout.ts';

test('landscape photos fill space beside a portrait instead of waiting for a new row', () => {
  const {positions, height} = masonryLayout([700, 300, 300, 700], 2, 400, 20, 24);
  assert.equal(positions[2].left, positions[1].left);
  assert.equal(positions[2].top, 324);
  assert.equal(positions[3].top, 648);
  assert.equal(height, 1348);
});

test('equal-height photos start at the left and an odd final photo stays left-aligned', () => {
  const {positions, height} = masonryLayout([300, 300, 300, 300, 300], 2, 400, 20, 24);
  assert.deepEqual(positions.at(-1), {left: 0, top: 648});
  assert.equal(height, 948);
  assert.equal(masonryLayout([], 2, 400, 20, 24).height, 0);
});

test('nearly equal photo heights keep an odd final photo left-aligned', () => {
  const heights = [300.75, 300, 300.25, 300.4, 300.1];
  const {positions} = masonryLayout(heights, 2, 400, 8, 10);
  assert.deepEqual(positions.map(position => position.left), [0, 408, 0, 408, 0]);
  assert.equal(positions[2].top, heights[0] + 10);
  assert.equal(positions[3].top, heights[1] + 10);
  assert.equal(positions[4].top, heights[0] + heights[2] + 20);
});

test('responsive column counts keep every photo within its column without overlap', () => {
  const heights = [600, 280, 400, 180, 650, 350, 280, 150];
  for (const columns of [2, 3, 4]) {
    const {positions, height} = masonryLayout(heights, columns, 240, 16, 24);
    positions.forEach((position, index) => {
      assert.ok(position.left >= 0 && position.left <= (columns - 1) * 256);
      assert.ok(position.top + heights[index] <= height);
      for (let previous = 0; previous < index; previous++) {
        if (positions[previous].left === position.left) assert.ok(position.top >= positions[previous].top + heights[previous] + 24);
      }
    });
  }
});
