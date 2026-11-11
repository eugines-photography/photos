import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startPanoramaMotion} from '../app/panorama-motion.ts';

function fixture({left = 100, maximum = 1000, rounded = false} = {}) {
  let position = left;
  const viewport = {
    clientWidth: 500, scrollWidth: 500 + maximum,
    get scrollLeft() {return position;},
    set scrollLeft(value) {position = rounded ? Math.round(value) : value;},
  };
  let next = 0;
  const frames = new Map();
  const clock = {
    requestAnimationFrame(callback) {const id = next++; frames.set(id, callback); return id;},
    cancelAnimationFrame(id) {frames.delete(id);},
  };
  return {viewport, clock, step(time) {const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time));}};
}

test('automatic panning reads the initial position after mounting and advances at the configured speed', () => {
  const app = fixture();
  const stop = startPanoramaMotion(app.viewport, app.clock, 18);
  app.viewport.scrollLeft = 300;
  app.step(0);
  for (let time = 100; time <= 1000; time += 100) app.step(time);
  assert.ok(Math.abs(app.viewport.scrollLeft - 318) < 0.01);
  stop();
});

test('fractional motion accumulates even when the browser rounds scroll positions', () => {
  const app = fixture({rounded: true});
  const stop = startPanoramaMotion(app.viewport, app.clock, 18);
  app.step(0);
  for (let frame = 1; frame <= 60; frame++) app.step(frame * 1000 / 60);
  assert.equal(app.viewport.scrollLeft, 118);
  stop();
});

test('the panorama pauses at an edge and then reverses direction', () => {
  const app = fixture({left: 4, maximum: 8});
  const stop = startPanoramaMotion(app.viewport, app.clock, 20);
  app.step(0);
  app.step(100);
  app.step(200);
  assert.equal(app.viewport.scrollLeft, 8);
  app.step(1000);
  assert.equal(app.viewport.scrollLeft, 8);
  app.step(1100);
  assert.equal(app.viewport.scrollLeft, 6);
  stop();
});

test('stopping prevents further animation and long background intervals do not jump', () => {
  const app = fixture();
  const stop = startPanoramaMotion(app.viewport, app.clock, 18);
  app.step(0);
  app.step(10000);
  assert.ok(app.viewport.scrollLeft - 100 <= 1.81);
  const last = app.viewport.scrollLeft;
  stop();
  app.step(11000);
  assert.equal(app.viewport.scrollLeft, last);
});

test('photos that fit remain still and can begin panning after a viewport resize', () => {
  const app = fixture({left: 0, maximum: 0});
  const stop = startPanoramaMotion(app.viewport, app.clock);
  app.step(0);
  app.step(100);
  assert.equal(app.viewport.scrollLeft, 0);
  app.viewport.scrollWidth = 900;
  app.step(200);
  assert.ok(app.viewport.scrollLeft > 0);
  stop();
});
