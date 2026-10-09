import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chartGeometry, monogram } from '../src/progress-profile/chart';
import { resources } from '../src/i18n/resources';

test('chart gaps preserve null measurements, real zeros and separate segments at every width', () => {
  const points = [2, null, 0, 5, null, 3].map((value, i) => ({
    value,
    label: String(i),
  }));
  for (const width of [120, 244, 310, 348]) {
    const chart = chartGeometry(points, width, 78);
    assert.deepEqual(
      chart.segments.map((segment) => segment.map((p) => p.value)),
      [[2], [0, 5], [3]],
    );
    assert.equal(chart.y(0), chart.baseline);
    assert.ok(chart.x(0) >= 0 && chart.x(5) <= width);
  }
});
test('one observation stays centered; large charts truncate explicitly without creating values', () => {
  assert.equal(
    chartGeometry([{ label: 'today', value: 7 }], 244, 78).x(0),
    122,
  );
  const points = Array.from({ length: 40 }, (_, value) => ({
    value,
    label: String(value),
  }));
  assert.deepEqual(chartGeometry(points, 244, 78).visible, points.slice(-26));
  assert.equal(
    chartGeometry([{ label: 'missing', value: null }], 244, 78).segments.length,
    0,
  );
});
test('profile initials derive from identity and unknown accounts use a neutral monogram', () => {
  assert.equal(monogram('  Ada Bianchi '), 'A');
  assert.equal(monogram(null), 'J');
  assert.equal(monogram(''), 'J');
  assert.equal(monogram('🌿 Ada'), '🌿');
});
test('new presentation has equivalent IT/EN keys and honest global-volume and identity fallbacks', () => {
  const it = resources.it.progressProfile,
    en = resources.en.progressProfile;
  assert.deepEqual(Object.keys(it).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(it.tabs).sort(), Object.keys(en.tabs).sort());
  assert.match(it.globalVolumeUnavailable, /non disponibile/);
  assert.match(en.globalVolumeUnavailable, /unavailable/);
  assert.equal(it.identityFallback, 'Il tuo account');
});
