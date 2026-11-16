const RATES = {
  bike: { base: 30, perKm: 8 },
  auto: { base: 45, perKm: 12 },
  car: { base: 70, perKm: 18 },
};

// Peak hours (24h) that attract a demand multiplier: morning + evening rush and late night.
const PEAK_HOURS = [8, 9, 10, 17, 18, 19, 23, 0, 1];

function surgeMultiplier(when = new Date()) {
  const hour = when.getHours();
  if (PEAK_HOURS.includes(hour)) return 1.25;
  return 1;
}

export function getSurgeMultiplier(when = new Date()) {
  return surgeMultiplier(when);
}

export function calculateRideFare(vehicleType, distanceKm, options = {}) {
  const rate = RATES[vehicleType];
  if (!rate)
    throw Object.assign(new Error("Unsupported vehicle type"), { status: 400 });
  // Distance fare is floored to whole rupees, then the minimum fare applies
  // before any surge multiplier.
  const base = Math.max(rate.base, Math.floor(rate.base + rate.perKm * distanceKm));
  const multiplier =
    options.surgeMultiplier ?? surgeMultiplier(options.at ?? new Date());
  return Math.round(base * multiplier);
}
