import assert from 'node:assert/strict';
import test from 'node:test';
import { animePink } from '../../../packages/ui/src/tokens';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (high! + 0.05) / (low! + 0.05);
}
test('light-body text, secondary actions and primary button captions satisfy WCAG AA', () => {
  for (const [foreground, background] of [
    [animePink.textPrimary, animePink.surface],
    [animePink.textPrimary, animePink.surfaceSoft],
    [animePink.textSecondary, animePink.background],
    [animePink.primaryText, animePink.surface],
    [animePink.white, animePink.primaryAction],
  ]) {
    assert.ok(contrast(foreground!, background!) >= 4.5);
  }
});
test('immersive workout text remains readable on the dark palette', () => {
  for (const foreground of [
    animePink.white,
    animePink.darkMuted,
    animePink.primaryPinkSoft,
  ]) {
    assert.ok(contrast(foreground, animePink.surfaceDark) >= 4.5);
  }
});
