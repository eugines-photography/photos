import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createViewTransitionRunner} from '../app/view-transitions.ts';

const motion = {matchMedia: () => ({matches: false})};

test('navigation commits inside the browser snapshot callback', async () => {
  let snapshot, updated = false, faded = false;
  const runner = createViewTransitionRunner({startViewTransition(update) {
    snapshot = update;
    return {ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() {}};
  }}, motion);
  runner.run(() => {updated = true;}, () => {faded = true;});
  assert.equal(updated, false);
  snapshot();
  assert.equal(updated, true);
  assert.equal(faded, false);
  runner.dispose();
});

test('unsupported browsers navigate immediately and animate the destination', () => {
  const events = [];
  const runner = createViewTransitionRunner({}, motion);
  runner.run(() => events.push('navigate'), () => events.push('fade'));
  assert.deepEqual(events, ['navigate', 'fade']);
});

test('reduced motion bypasses both native transitions and fallback animation', () => {
  let updated = false;
  const runner = createViewTransitionRunner({startViewTransition() {assert.fail('Animation must be disabled');}}, {matchMedia: () => ({matches: true})});
  runner.run(() => {updated = true;}, () => assert.fail('Fallback must be disabled'));
  assert.equal(updated, true);
});

test('rapid navigation cancels stale snapshots and disposal prevents late updates', () => {
  const snapshots = [], events = [];
  let skipped = 0;
  const runner = createViewTransitionRunner({startViewTransition(update) {
    snapshots.push(update);
    return {ready: Promise.resolve(), finished: new Promise(() => {}), skipTransition() {skipped++;}};
  }}, motion);
  runner.run(() => events.push('first'), () => {});
  runner.run(() => events.push('second'), () => {});
  snapshots[0]();
  snapshots[1]();
  assert.deepEqual(events, ['second']);
  assert.equal(skipped, 1);
  runner.run(() => events.push('third'), () => {});
  runner.dispose();
  snapshots[2]();
  assert.deepEqual(events, ['second']);
});

test('a browser transition failure still commits navigation once', () => {
  let updates = 0, fades = 0;
  const runner = createViewTransitionRunner({startViewTransition(update) {update(); throw Error('Snapshot unavailable');}}, motion);
  runner.run(() => updates++, () => fades++);
  assert.equal(updates, 1);
  assert.equal(fades, 1);
});
