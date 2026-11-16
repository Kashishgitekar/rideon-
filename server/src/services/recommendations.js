const FEATURE_WEIGHTS = {
  category: 0.35,
  fuelType: 0.15,
  transmission: 0.15,
  price: 0.2,
  seats: 0.15
};

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function similarity(value, preferredValue) {
  return value && preferredValue && value.toLowerCase() === preferredValue.toLowerCase() ? 1 : 0;
}

export function buildPreferenceProfile(bookings) {
  const vehicles = bookings.map(booking => booking.vehicle).filter(Boolean);
  return {
    categories: new Set(vehicles.map(vehicle => vehicle.category).filter(Boolean)),
    fuelTypes: new Set(vehicles.map(vehicle => vehicle.fuelType).filter(Boolean)),
    transmissions: new Set(vehicles.map(vehicle => vehicle.transmission).filter(Boolean)),
    averagePrice: average(vehicles.map(vehicle => vehicle.pricePerDay).filter(Number.isFinite)),
    averageSeats: average(vehicles.map(vehicle => vehicle.seats).filter(Number.isFinite))
  };
}

export function scoreVehicle(vehicle, profile) {
  const categoryScore = profile.categories.has(vehicle.category) ? 1 : 0;
  const fuelScore = profile.fuelTypes.has(vehicle.fuelType) ? 1 : 0;
  const transmissionScore = profile.transmissions.has(vehicle.transmission) ? 1 : 0;
  const priceScore = profile.averagePrice
    ? Math.max(0, 1 - Math.abs(vehicle.pricePerDay - profile.averagePrice) / profile.averagePrice)
    : 0.5;
  const seatsScore = profile.averageSeats
    ? Math.max(0, 1 - Math.abs(vehicle.seats - profile.averageSeats) / profile.averageSeats)
    : 0.5;

  const score = categoryScore * FEATURE_WEIGHTS.category
    + fuelScore * FEATURE_WEIGHTS.fuelType
    + transmissionScore * FEATURE_WEIGHTS.transmission
    + priceScore * FEATURE_WEIGHTS.price
    + seatsScore * FEATURE_WEIGHTS.seats;

  const reasons = [];
  if (categoryScore) reasons.push(`matches your ${vehicle.category} preference`);
  if (fuelScore) reasons.push(`${vehicle.fuelType} fuel`);
  if (transmissionScore) reasons.push(`${vehicle.transmission} transmission`);
  if (!reasons.length) reasons.push('fits a broad range of journeys');

  return { score: Number(score.toFixed(3)), reason: reasons.slice(0, 2).join(' and ') };
}

export function rankVehicles(vehicles, bookings, limit = 6) {
  const profile = buildPreferenceProfile(bookings);
  return vehicles
    .map(vehicle => ({ vehicle, ...scoreVehicle(vehicle, profile) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
