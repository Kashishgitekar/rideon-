// Razorpay payment service. All credentials come from env: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
// If credentials are missing, the service operates in a simulated mode so development continues safely.
import crypto from 'node:crypto';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export function paymentMode() {
  return keyId && keySecret ? 'razorpay' : 'simulated';
}

async function razorpayFetch(path, method, body) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.description || 'Razorpay request failed'), { status: 502 });
  }
  return payload;
}

export async function createOrder(amountInRupees, receipt) {
  const amountPaise = Math.round(amountInRupees * 100);
  if (paymentMode() === 'razorpay') {
    const order = await razorpayFetch('/orders', 'POST', { amount: amountPaise, currency: 'INR', receipt });
    return { provider: 'razorpay', orderId: order.id, amount: order.amount, currency: order.currency, keyId };
  }
  // Simulated order for local development without keys.
  return { provider: 'simulated', orderId: `sim_order_${receipt}_${crypto.randomBytes(4).toString('hex')}`, amount: amountPaise, currency: 'INR', keyId: null };
}

export function verifySignature(orderId, paymentId, signature) {
  if (paymentMode() !== 'razorpay') return true; // simulated mode accepts client confirmation
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || '', 'utf8'));
  } catch {
    return false;
  }
}

export async function refundPayment(paymentId, amountInRupees) {
  const amountPaise = Math.round(amountInRupees * 100);
  if (paymentMode() === 'razorpay') {
    const refund = await razorpayFetch(`/payments/${paymentId}/refund`, 'POST', { amount: amountPaise });
    return { provider: 'razorpay', refundId: refund.id, amount: refund.amount };
  }
  return { provider: 'simulated', refundId: `sim_refund_${crypto.randomBytes(4).toString('hex')}`, amount: amountPaise };
}
