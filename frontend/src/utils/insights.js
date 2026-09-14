export function calculateInsights(listings) {
  const active = listings.filter(
    (x) => x.is_live === true
  );

  const twoBhk = active.filter(
    (x) =>
      Number(x.bedroom) === 2 &&
      Number(x.price) > 0 &&
      Number(x.carpet_area) > 0
  );

  const avgPricePerSqft =
    twoBhk.length === 0
      ? 0
      : twoBhk.reduce(
          (sum, x) =>
            sum +
            Number(x.price) /
              Number(x.carpet_area),
          0
        ) / twoBhk.length;

  const localityMap = {};

  active.forEach((x) => {
    if (!x.locality) return;

    localityMap[x.locality] =
      (localityMap[x.locality] || 0) + 1;
  });

  const localities = Object.entries(localityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const verified = active.filter(
    (x) => x.is_verified === true
  ).length;

  return {
    total: listings.length,
    active: active.length,
    verified,
    avgPricePerSqft,
    localities
  };
}

// --- Added Coordinate Anomaly Checker for CoordinateAudit.jsx & Insights Radar ---
const PUNE_BOUNDS = { latMin: 18.2, latMax: 18.8, lonMin: 73.5, lonMax: 74.2 };

export function findCoordinateAnomalies(listings) {
  if (!Array.isArray(listings)) return [];
  return listings
    .filter((l) => {
      const lat = Number(l.latitude);
      const lon = Number(l.longitude);
      if (isNaN(lat) || isNaN(lon)) return false;
      return (
        lat < PUNE_BOUNDS.latMin ||
        lat > PUNE_BOUNDS.latMax ||
        lon < PUNE_BOUNDS.lonMin ||
        lon > PUNE_BOUNDS.lonMax
      );
    })
    .map((l) => ({
      listingId: l.listing_id || l.id,
      statedLocality: l.locality,
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
    }));
}