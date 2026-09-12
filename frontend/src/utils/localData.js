let cache = null;

export async function getLocalListings() {
  if (cache) return cache;

  const response = await fetch("/listings.json");

  if (!response.ok) {
    throw new Error("Could not load listings.json");
  }

  const data = await response.json();

  cache = Array.isArray(data)
    ? data
    : data.listings || data.results || [];

  return cache;
}

export function formatPrice(value) {
  const price = Number(value || 0);

  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  }

  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(2)} L`;
  }

  return `₹${price.toLocaleString("en-IN")}`;
}

export function formatArea(value) {
  return `${Number(value || 0).toLocaleString("en-IN")} sq.ft`;
}

export function filterListings(listings, filters = {}) {
  return listings.filter((item) => {
    if (
      filters.locality &&
      item.locality?.toLowerCase() !==
        filters.locality.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.bedroom &&
      Number(item.bedroom) !== Number(filters.bedroom)
    ) {
      return false;
    }

    if (
      filters.furnishing &&
      item.furnishing?.toLowerCase() !==
        filters.furnishing.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.minPrice &&
      Number(item.price) < Number(filters.minPrice)
    ) {
      return false;
    }

    if (
      filters.maxPrice &&
      Number(item.price) > Number(filters.maxPrice)
    ) {
      return false;
    }

    return true;
  });
}