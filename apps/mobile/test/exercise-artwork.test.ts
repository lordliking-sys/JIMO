import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  exerciseArtworkFile,
  exerciseArtworkKey,
  exerciseArtworkFiles,
} from '../src/programs/exercise-artwork';
import {
  restControlLabel,
  stepRestControl,
} from '../src/programs/rest-control';
import {
  sectionHeroHeight,
  programHeroHeight,
} from '../src/components/section-hero-geometry';

const exercise = (canonicalName: string, isCustom = false) => ({
  canonicalName,
  isCustom,
});
test('exact canonical movement aliases map to the declared artwork without fuzzy substitutions', () => {
  for (const name of ['Pull-Up', 'pull_up', 'Trazioni'])
    assert.equal(exerciseArtworkKey(exercise(name)), 'pull_up');
  assert.equal(exerciseArtworkKey(exercise('Piegamenti')), 'push_up');
  assert.equal(exerciseArtworkKey(exercise('Hollow Hold')), 'hollow_hold');
  for (const name of [
    'Bench Press',
    'Panca piana',
    'Side Plank',
    'Barbell Squat',
    'Lat Pulldown',
    'Reverse Lunge',
  ])
    assert.equal(exerciseArtworkFile(exercise(name)), null);
  assert.equal(exerciseArtworkFile(exercise('Plank', true)), null);
});
test('variant selection never substitutes male/reference assets for missing female originals', () => {
  assert.equal(
    exerciseArtworkFile(exercise('Pull-Up'), 'female'),
    'exercise-art/female/pull_up.png',
  );
  assert.equal(exerciseArtworkFile(exercise('Push-Up'), 'female'), null);
  assert.equal(exerciseArtworkFile(exercise('Glute Bridge'), 'female'), null);
  assert.equal(
    exerciseArtworkFile(exercise('Push-Up')),
    'exercise-art/male/push_up.png',
  );
});
test('registry matches the original manifest and only transparent UI files exist', () => {
  const root = join(import.meta.dirname, '../assets/jimo/exercises');
  const manifest = JSON.parse(
    readFileSync(join(root, 'ASSET_MANIFEST.json'), 'utf8'),
  );
  for (const variant of ['male', 'female'] as const) {
    assert.deepEqual(
      exerciseArtworkFiles[variant],
      manifest[variant].exercises,
    );
    for (const file of Object.values(exerciseArtworkFiles[variant])) {
      const data = readFileSync(join(root, file));
      assert.equal(data.subarray(1, 4).toString(), 'PNG');
      assert.equal(data[25], 6); // Original RGBA PNG; no replacement or rasterized UI.
    }
  }
  assert.equal(
    existsSync(
      join(root, 'exercise-art/female/reference_only_not_transparent'),
    ),
    false,
  );
  for (const tone of ['light', 'dark'])
    assert.ok(existsSync(join(root, manifest.card_backgrounds[tone])));
});
test('rest retains exact seconds, formats minutes and uses bounded fifteen-second steps', () => {
  const labels = [
    ['', '—'],
    ['30', '30 sec'],
    ['45', '45 sec'],
    ['60', '1:00'],
    ['75', '1:15'],
    ['90', '1:30'],
    ['120', '2:00'],
  ];
  for (const [value, label] of labels)
    assert.equal(restControlLabel(value!, 'sec'), label);
  assert.equal(stepRestControl('37', 1), '52');
  assert.equal(stepRestControl('37', -1), '22');
  assert.equal(stepRestControl('', 1), '15');
  assert.equal(stepRestControl('', -1), '');
  assert.equal(stepRestControl('0', -1), '0');
  assert.equal(stepRestControl('86400', 1), '86400');
  assert.throws(() => stepRestControl('1:30', 1));
  assert.equal(restControlLabel('invalid', 'sec'), 'invalid');
});
test('one section boundary covers all requested widths while program forms use compact headers', () => {
  for (const width of [320, 390, 393, 430]) {
    assert.ok(sectionHeroHeight(width, 1) >= 320);
    assert.ok(programHeroHeight(width, 1) < sectionHeroHeight(width, 1));
    assert.ok(sectionHeroHeight(width, 1.8) > sectionHeroHeight(width, 1));
  }
});
