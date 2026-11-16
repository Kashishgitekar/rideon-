import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreferenceProfile, rankVehicles, scoreVehicle } from '../src/services/recommendations.js';

const previousVehicle = {
  category: 'SUV',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  pricePerDay: 2000,
  seats: 5
};

test('builds a preference profile from booking history', () => {
  const profile = buildPreferenceProfile([{ vehicle: previousVehicle }]);
  assert.equal(profile.categories.has('SUV'), true);
  assert.equal(profile.averagePrice, 2000);
  assert.equal(profile.averageSeats, 5);
});

test('scores vehicles using matching content features', () => {
  const profile = buildPreferenceProfile([{ vehicle: previousVehicle }]);
  const matching = scoreVehicle({ ...previousVehicle }, profile);
  const different = scoreVehicle({ ...previousVehicle, category: 'Hatchback', fuelType: 'Diesel' }, profile);
  assert.ok(matching.score > different.score);
  assert.match(matching.reason, /SUV/);
});

test('returns highest-scoring vehicles first', () => {
  const vehicles = [
    { ...previousVehicle, name: 'Match' },
    { ...previousVehicle, name: 'Different', category: 'Hatchback', transmission: 'Manual' }
  ];
  const ranked = rankVehicles(vehicles, [{ vehicle: previousVehicle }], 1);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].vehicle.name, 'Match');
});
