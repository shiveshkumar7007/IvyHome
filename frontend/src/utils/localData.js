let listingsCache = null;
let rentalsCache = null;
let projectsCache = null;

export async function getLocalListings() {
  if (listingsCache) return listingsCache;

  const response = await fetch("/listings.json");

  if (!response.ok) {
    throw new Error("Could not load listings.json");
  }

  const data = await response.json();

  listingsCache = Array.isArray(data)
    ? data
    : data.listings || data.results || [];

  return listingsCache;
}

export async function getLocalRentals() {
  if (rentalsCache) return rentalsCache;

  const response = await fetch("/rentals.json");

  if (!response.ok) {
    throw new Error("Could not load rentals.json");
  }

  const data = await response.json();

  rentalsCache = Array.isArray(data)
    ? data
    : data.rentals || data.results || [];

  return rentalsCache;
}

export async function getLocalProjects() {
  if (projectsCache) return projectsCache;

  const response = await fetch("/projects.json");

  if (!response.ok) {
    throw new Error("Could not load projects.json");
  }

  const data = await response.json();

  projectsCache = Array.isArray(data)
    ? data
    : data.projects || data.results || [];

  return projectsCache;
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