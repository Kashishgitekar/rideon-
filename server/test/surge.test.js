import test from "node:test";
import assert from "node:assert/strict";
import { calculateRideFare, getSurgeMultiplier } from "../src/services/fare.js";

test("base fare is unchanged when there is no surge", () => {
  const fare = calculateRideFare("bike", 1, { surgeMultiplier: 1 });
  assert.equal(fare, 38);
});

test("surge multiplier raises the fare proportionally", () => {
  const base = calculateRideFare("car", 10, { surgeMultiplier: 1 });
  const surged = calculateRideFare("car", 10, { surgeMultiplier: 1.25 });
  assert.equal(surged, Math.round(base * 1.25));
});

test("peak-hour helper returns 1.25 and normal hours return 1", () => {
  const peak = new Date(2026, 0, 1, 9, 0, 0);
  const normal = new Date(2026, 0, 1, 14, 0, 0);
  assert.equal(getSurgeMultiplier(peak), 1.25);
  assert.equal(getSurgeMultiplier(normal), 1);
});

test("minimum fare still applies under surge", () => {
  // base 30 is the floor before surge; surge scales the floored price
  assert.equal(calculateRideFare("bike", 0.1, { surgeMultiplier: 1 }), 30);
  assert.equal(calculateRideFare("bike", 0.1, { surgeMultiplier: 1.25 }), 38);
});
