import { fixPropertyData } from "../utils/helpers";

// In-memory Promise locks and caches to prevent parallel fetch triggers
let listingsFetchPromise = null;
let rentalsFetchPromise = null;
let projectsFetchPromise = null;

async function loadLocalDatabase() {
  if (window.__IVY_DB_CACHE__ && window.__IVY_DB_CACHE__.length > 0) {
    return window.__IVY_DB_CACHE__;
  }

  if (listingsFetchPromise) {
    return listingsFetchPromise;
  }

  listingsFetchPromise = (async () => {
    try {
      const res = await fetch('/listings.json');
      if (!res.ok) throw new Error("Failed to load local listings.json database");
      const raw = await res.json();
      
      let items = [];
      if (Array.isArray(raw)) items = raw;
      else items = raw?.results || raw?.data || raw?.listings || raw?.items || [];
      
      const fixed = items.map(fixPropertyData);
      window.__IVY_DB_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local database load error:", err);
      return [];
    } finally {
      listingsFetchPromise = null;
    }
  })();

  return listingsFetchPromise;
}

async function loadRentalsDatabase() {
  if (window.__IVY_RENTALS_CACHE__ && window.__IVY_RENTALS_CACHE__.length > 0) {
    return window.__IVY_RENTALS_CACHE__;
  }

  if (rentalsFetchPromise) {
    return rentalsFetchPromise;
  }

  rentalsFetchPromise = (async () => {
    try {
      const res = await fetch('/rentals.json');
      if (!res.ok) throw new Error("Failed to load local rentals.json database");
      const raw = await res.json();
      
      let items = [];
      if (Array.isArray(raw)) items = raw;
      else items = raw?.results || raw?.data || raw?.rentals || raw?.items || [];
      
      const fixed = items.map(fixPropertyData);
      window.__IVY_RENTALS_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local rentals database load error:", err);
      return [];
    } finally {
      rentalsFetchPromise = null;
    }
  })();

  return rentalsFetchPromise;
}

async function loadProjectsDatabase() {
  if (window.__IVY_PROJECTS_CACHE__ && window.__IVY_PROJECTS_CACHE__.length > 0) {
    return window.__IVY_PROJECTS_CACHE__;
  }

  if (projectsFetchPromise) {
    return projectsFetchPromise;
  }

  projectsFetchPromise = (async () => {
    try {
      const res = await fetch('/projects.json');
      if (!res.ok) throw new Error("Failed to load local projects.json database");
      const raw = await res.json();
      
      let items = [];
      if (Array.isArray(raw)) items = raw;
      else items = raw?.results || raw?.data || raw?.projects || raw?.items || [];
      
      const fixed = items.map(fixPropertyData);
      window.__IVY_PROJECTS_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local projects database load error:", err);
      return [];
    } finally {
      projectsFetchPromise = null;
    }
  })();

  return projectsFetchPromise;
}

export async function isAuthenticated() {
  return true;
}

export function getAccessToken() {
  return "local-mock-token";
}

export function logout() {
  window.location.href = "/login";
}

export async function login(email, password) {
  return { access_token: "local-token", user: { email: email || "admin@ivy.homes" } };
}

export function extractItems(response) {
  if (Array.isArray(response)) return response.map(fixPropertyData);
  if (response && Array.isArray(response.results)) return response.results.map(fixPropertyData);
  if (response && Array.isArray(response.data)) return response.data.map(fixPropertyData);
  return [];
}

// --- Listings Database Layer ---
export async function getListings(params = {}) {
  const db = await loadLocalDatabase();
  let results = [...db];

  if (params.locality) {
    const loc = params.locality.toLowerCase();
    results = results.filter(item => String(item.locality || "").toLowerCase().includes(loc));
  }
  if (params.bedroom || params.bhk) {
    const bhk = Number(params.bedroom || params.bhk);
    results = results.filter(item => Number(item.bedroom) === bhk);
  }

  const limit = Number(params.limit);
  const offset = Number(params.offset) || 0;
  if (!isNaN(limit)) {
    return results.slice(offset, offset + limit);
  }

  return results;
}

export async function getAllListings(params = {}) {
  return loadLocalDatabase();
}

export async function getListing(id) {
  const db = await loadLocalDatabase();
  const found = db.find(item => String(item.listing_id || item.id) === String(id));
  if (!found) throw new Error(`Listing not found: ${id}`);
  return found;
}

// --- Rentals Database Layer ---
export async function getRentals(params = {}) {
  const db = await loadRentalsDatabase();
  let results = [...db];

  if (params.locality) {
    const loc = params.locality.toLowerCase();
    results = results.filter(item => String(item.locality || "").toLowerCase().includes(loc));
  }

  const limit = Number(params.limit);
  const offset = Number(params.offset) || 0;
  if (!isNaN(limit)) {
    return results.slice(offset, offset + limit);
  }

  return results;
}

export async function getAllRentals(params = {}) {
  return loadRentalsDatabase();
}

export async function getRental(id) {
  const db = await loadRentalsDatabase();
  const found = db.find(item => String(item.rental_id || item.id || item.listing_id) === String(id));
  if (!found) throw new Error(`Rental not found: ${id}`);
  return found;
}

// --- Projects Database Layer ---
export async function getProjects(params = {}) {
  const db = await loadProjectsDatabase();
  let results = [...db];

  if (params.locality) {
    const loc = params.locality.toLowerCase();
    results = results.filter(item => String(item.locality || "").toLowerCase().includes(loc));
  }

  const limit = Number(params.limit);
  const offset = Number(params.offset) || 0;
  if (!isNaN(limit)) {
    return results.slice(offset, offset + limit);
  }

  return results;
}

export async function getAllProjects(params = {}) {
  return loadProjectsDatabase();
}

export async function getProject(id) {
  const db = await loadProjectsDatabase();
  const found = db.find(item => String(item.project_id || item.id) === String(id));
  if (!found) throw new Error(`Project not found: ${id}`);
  return found;
}

// --- Favourites / Favorites Management ---
function getUserFavKey() {
  return `ivy_favs_local`;
}

export async function getFavourites() {
  try {
    const favs = JSON.parse(localStorage.getItem(getUserFavKey()) || "[]");
    return favs.map(fixPropertyData);
  } catch {
    return [];
  }
}
export const getFavorites = getFavourites;

export async function addFavourite(listingId) {
  const db = await loadLocalDatabase();
  const rentalsDb = await loadRentalsDatabase();
  const projectsDb = await loadProjectsDatabase();
  
  const allCombined = [...db, ...rentalsDb, ...projectsDb];
  const key = getUserFavKey();
  const favs = JSON.parse(localStorage.getItem(key) || "[]");
  
  if (!favs.find(f => String(f.listing_id || f.id || f.project_id || f.rental_id) === String(listingId))) {
    const item = allCombined.find(f => String(f.listing_id || f.id || f.project_id || f.rental_id) === String(listingId));
    if (item) {
      favs.push(item);
      localStorage.setItem(key, JSON.stringify(favs));
    }
  }
  return { success: true };
}
export const addFavorite = addFavourite;

export async function removeFavourite(listingId) {
  const key = getUserFavKey();
  let favs = JSON.parse(localStorage.getItem(key) || "[]");
  favs = favs.filter(f => String(f.listing_id || f.id || f.project_id || f.rental_id) !== String(listingId));
  localStorage.setItem(key, JSON.stringify(favs));
  return { success: true };
}
export const removeFavorite = removeFavourite;

// --- Insights / Analytics Summary ---
export async function getInsights() {
  const db = await loadLocalDatabase();
  const prices = db.map(l => Number(l.price) || 0).filter(p => p > 0).sort((a, b) => a - b);
  return {
    total_listings: db.length,
    median_price: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
    median_price_per_sqft: 6500
  };
}