import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPanoramaInteractions, panoramaPosition} from '../app/panorama-interactions.ts';

function setup() {
  const viewport = {scrollLeft: 300, scrollWidth: 1500, clientWidth: 500};
  const events = [];
  let next = 0;
  const timers = new Map();
  const clock = {
    setTimeout(callback) {timers.set(++next, callback); return next;},
    clearTimeout(id) {timers.delete(id);},
    settle() {const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback());},
  };
  return {viewport, events, clock, tracker: createPanoramaInteractions(viewport, event => events.push(event), clock)};
}

test('automatic movement, stationary clicks, and wheel input without scrolling do not count as exploration', () => {
  const {viewport, tracker, events, clock} = setup();
  viewport.scrollLeft = 400;
  tracker.moved();
  tracker.begin('drag', true);
  tracker.release();
  clock.settle();
  tracker.begin('wheel');
  clock.settle();
  assert.deepEqual(events, []);
});

test('a held drag produces one event after release with normalized start and end positions', () => {
  const {viewport, tracker, events, clock} = setup();
  tracker.begin('drag', true);
  for (const left of [400, 500, 600]) {viewport.scrollLeft = left; tracker.moved(); clock.settle();}
  assert.deepEqual(events, []);
  tracker.release();
  clock.settle();
  tracker.flush();
  assert.deepEqual(events, [{action: 'pan', method: 'drag', start_percent: 30, end_percent: 60}]);
});

test('a native swipe includes movement after pointer cancellation and momentum', () => {
  const {viewport, tracker, events, clock} = setup();
  tracker.begin('swipe', true);
  tracker.release();
  for (const left of [500, 600, 800]) {viewport.scrollLeft = left; tracker.moved();}
  clock.settle();
  assert.deepEqual(events, [{action: 'pan', method: 'swipe', start_percent: 30, end_percent: 80}]);
});

test('wheel and keyboard repeats are grouped and pending gestures flush once on close', () => {
  for (const method of ['wheel', 'keyboard']) {
    const {viewport, tracker, events, clock} = setup();
    for (const left of [400, 500, 600]) {tracker.begin(method); viewport.scrollLeft = left; tracker.moved();}
    tracker.flush();
    clock.settle();
    assert.deepEqual(events, [{action: 'pan', method, start_percent: 30, end_percent: 60}]);
  }
});

test('switching input methods finishes the previous gesture without mixing its properties', () => {
  const {viewport, tracker, events, clock} = setup();
  tracker.begin('wheel'); viewport.scrollLeft = 500; tracker.moved();
  tracker.begin('keyboard'); viewport.scrollLeft = 400; tracker.moved();
  clock.settle();
  assert.deepEqual(events.map(event => [event.method, event.start_percent, event.end_percent]), [['wheel', 30, 50], ['keyboard', 50, 40]]);
});

test('pan positions stay within 0–100 percent, including images without overflow', () => {
  assert.equal(panoramaPosition({scrollLeft: -30, scrollWidth: 1000, clientWidth: 500}), 0);
  assert.equal(panoramaPosition({scrollLeft: 600, scrollWidth: 1000, clientWidth: 500}), 100);
  assert.equal(panoramaPosition({scrollLeft: 0, scrollWidth: 500, clientWidth: 500}), 0);
});
