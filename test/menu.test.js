import test from 'node:test';
import assert from 'node:assert';
import { needsSwap, shouldHide } from '../src/menu.js';
import { MARKER } from '../src/home.js';

test('test_native_main_is_swapped', () => {
  assert.strictEqual(needsSwap({ component: 'main', activity: { component: {} } }), true);
});

test('test_lh_home_restored_before_registration_is_swapped', () => {
  // start_page='last': Lampa built its nocomponent page under our name
  assert.strictEqual(needsSwap({ component: 'lh_home', activity: { component: {} } }), true);
});

test('test_live_lh_home_is_left_alone', () => {
  assert.strictEqual(needsSwap({ component: 'lh_home', activity: { component: { [MARKER]: true } } }), false);
});

test('test_other_activities_and_none_are_left_alone', () => {
  assert.strictEqual(needsSwap({ component: 'full', activity: { component: {} } }), false);
  assert.strictEqual(needsSwap(undefined), false);
});

test('test_should_hide_keeps_allowed_actions', () => {
  for (const a of ['main', 'movie', 'tv', 'cartoon', 'anime', 'settings']) {
    assert.strictEqual(shouldHide(a), false, a);
  }
  for (const a of ['feed', 'myperson', 'catalog', 'filter', 'relise', 'favorite', 'history', 'subscribes', 'timetable', 'mytorrents', 'about', 'console', 'edit']) {
    assert.strictEqual(shouldHide(a), true, a);
  }
});
