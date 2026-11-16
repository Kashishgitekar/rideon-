// Cancellation refund policy: percentages based on how far ahead of start time the cancellation happens.
export function refundPercent(startAt, now = new Date()) {
  const hoursLeft = (new Date(startAt).getTime() - now.getTime()) / 3600000;
  if (hoursLeft >= 48) return 100;
  if (hoursLeft >= 24) return 75;
  if (hoursLeft >= 6) return 50;
  return 0;
}

export function refundQuote(totalAmount, startAt, now = new Date()) {
  const percent = refundPercent(startAt, now);
  return { percent, amount: Math.round((totalAmount * percent) / 100) };
}
