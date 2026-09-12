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