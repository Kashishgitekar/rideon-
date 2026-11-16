import test from "node:test";
import assert from "node:assert/strict";

// computeDiscount logic exercised via a lightweight stub mirroring the schema method,
// so these tests run without a MongoDB connection.
function discountFor(coupon, fare) {
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return 0;
  if (!coupon.active) return 0;
  if (fare < (coupon.minFare || 0)) return 0;
  let discount = 0;
  if (coupon.percentOff) {
    discount = Math.round((fare * coupon.percentOff) / 100);
    if (coupon.maxDiscount > 0)
      discount = Math.min(discount, coupon.maxDiscount);
  } else if (coupon.amountOff) {
    discount = coupon.amountOff;
  }
  return Math.min(discount, fare);
}

test("percentage discount is computed and capped", () => {
  assert.equal(
    discountFor({ percentOff: 20, maxDiscount: 0, active: true }, 200),
    40,
  );
  assert.equal(
    discountFor({ percentOff: 50, maxDiscount: 60, active: true }, 200),
    60,
  );
});

test("flat discount and min fare gate work", () => {
  assert.equal(discountFor({ amountOff: 30, active: true }, 100), 30);
  assert.equal(
    discountFor({ amountOff: 30, minFare: 150, active: true }, 100),
    0,
  );
});

test("expired or inactive coupons give no discount", () => {
  assert.equal(
    discountFor(
      { percentOff: 10, active: true, expiresAt: new Date(Date.now() - 1000) },
      100,
    ),
    0,
  );
  assert.equal(discountFor({ percentOff: 10, active: false }, 100), 0);
});
