import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice } from '../src/services/pricing.js';
test('calculates a minimum one-day rental plus tax', () => {
  assert.deepEqual(calculatePrice(1000, '2026-01-01T10:00:00Z', '2026-01-01T18:00:00Z'), { days: 1, base: 1000, tax: 50, total: 1050 });
});
