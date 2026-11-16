export function calculatePrice(pricePerDay, startAt, endAt) {
  const milliseconds = new Date(endAt) - new Date(startAt);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    throw Object.assign(new Error('Return time must be after pickup time'), { status: 400 });
  }
  const days = Math.max(1, Math.ceil(milliseconds / 86400000));
  const base = pricePerDay * days;
  const tax = Math.round(base * 0.05);
  return { days, base, tax, total: base + tax };
}
