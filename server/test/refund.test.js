import test from "node:test";
import assert from "node:assert/strict";
import { refundPercent, refundQuote } from "../src/services/refund.js";

test("full refund 48+ hours before pickup", () => {
  const start = new Date(Date.now() + 72 * 3600000);
  assert.equal(refundPercent(start), 100);
});

test("75 percent refund 24-48 hours before pickup", () => {
  const start = new Date(Date.now() + 30 * 3600000);
  assert.equal(refundPercent(start), 75);
});

test("half refund 6-24 hours before pickup", () => {
  const start = new Date(Date.now() + 10 * 3600000);
  assert.equal(refundPercent(start), 50);
});

test("no refund inside 6 hours of pickup", () => {
  const start = new Date(Date.now() + 2 * 3600000);
  assert.equal(refundPercent(start), 0);
});

test("refund quote computes rounded amount", () => {
  const start = new Date(Date.now() + 60 * 3600000); // 60h out: still 100%
  const quote = refundQuote(1001, start);
  assert.equal(quote.percent, 100);
  assert.equal(quote.amount, 1001);
});
