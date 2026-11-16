import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRideFare } from '../src/services/fare.js';

test('calculates a minimum bike fare', () => {
  assert.equal(calculateRideFare('bike', 1, { surgeMultiplier: 1 }), 38);
});

test('calculates different fares by vehicle type', () => {
  assert.ok(calculateRideFare('car', 10, { surgeMultiplier: 1 }) > calculateRideFare('bike', 10, { surgeMultiplier: 1 }));
});
