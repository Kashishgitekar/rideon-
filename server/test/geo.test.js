import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { stateOf } from "../src/routes/bookings.js";
import { verifySignature } from "../src/services/payments.js";

test("stateOf resolves known cities to state codes", () => {
  assert.equal(stateOf("Hinjawadi, Pune"), "MH");
  assert.equal(stateOf("Bengaluru Airport"), "KA");
});

test("stateOf returns null for unknown locations", () => {
  assert.equal(stateOf("somewhere far away"), null);
  assert.equal(stateOf(""), null);
});

test("simulated mode always verifies signatures", () => {
  process.env.RAZORPAY_KEY_ID = "";
  process.env.RAZORPAY_KEY_SECRET = "";
  assert.equal(verifySignature("order_x", "pay_x", "badsig"), true);
});

test("model registration sanity after new fields", () => {
  const Booking = mongoose.model("Booking");
  assert.ok(Booking.schema.path("interstate"));
});

// Import after stateOf defined via ESM hoisting; bookings.js imports models, safe to load.
void mongoose;
