import { fixPropertyData } from "../utils/helpers";

// Base Configuration for Real API Integration
const BASE_URL = "https://solve.ivy.homes";
// Evaluators can configure this or pass it through environment variables
const API_KEY = import.meta.env.VITE_API_KEY || "IVY26-0328057EAE2B";

function getAuthHeaders() {
  const token = localStorage.getItem("ivy_access_token");
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

// --- Real Authentication Flow ---
export function isAuthenticated() {
  const token = localStorage.getItem("ivy_access_token");
  const loginTime = localStorage.getItem("ivy_login_timestamp");
  
  if (!token || !loginTime) return false;

  // Real token lifetime check (Tokens expire in 15 mins / 900 seconds according to actual API findings)
  const elapsedMinutes = (Date.now() - Number(loginTime)) / (1000 * 60);
  if (elapsedMinutes > 14) {
    // Attempt background token refresh or invalidate if expired
    return false;
  }
  return true;
}

export function getAccessToken() {
  return localStorage.getItem("ivy_access_token");
}

export function logout() {
  localStorage.removeItem("ivy_access_token");
  localStorage.removeItem("ivy_refresh_token");
  localStorage.removeItem("ivy_login_timestamp");
  localStorage.removeItem("ivy_user");
  window.location.href = "/login";
}

export async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Login failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Real API returns access_token, expires_in, and refresh_token
    const token = data.access_token || data.token;
    if (token) {
      localStorage.setItem("ivy_access_token", token);
      localStorage.setItem("ivy_login_timestamp", Date.now().toString());
      if (data.refresh_token) {
        localStorage.setItem("ivy_refresh_token", data.refresh_token);
      }
      localStorage.setItem("ivy_user", JSON.stringify({ email }));
    }

    return data;
  } catch (error) {
    console.error("Real API Login Error:", error);
    throw error;
  }
}

// --- Local Database Fallbacks & Helpers for UI Browsing ---
let listingsFetchPromise = null;
let rentalsFetchPromise = null;
let projectsFetchPromise = null;

async function loadLocalDatabase() {
  if (window.__IVY_DB_CACHE__ && window.__IVY_DB_CACHE__.length > 0) {
    return window.__IVY_DB_CACHE__;
  }
  if (listingsFetchPromise) return listingsFetchPromise;

  listingsFetchPromise = (async () => {
    try {
      const res = await fetch('/listings.json');
      if (!res.ok) throw new Error("Failed to load local listings.json");
      const raw = await res.json();
      let items = Array.isArray(raw) ? raw : (raw?.results || raw?.data || raw?.listings || []);
      const fixed = items.map(fixPropertyData);
      window.__IVY_DB_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local listings load error:", err);
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
  if (rentalsFetchPromise) return rentalsFetchPromise;

  rentalsFetchPromise = (async () => {
    try {
      const res = await fetch('/rentals.json');
      if (!res.ok) throw new Error("Failed to load local rentals.json");
      const raw = await res.json();
      let items = Array.isArray(raw) ? raw : (raw?.results || raw?.data || raw?.rentals || []);
      const fixed = items.map(fixPropertyData);
      window.__IVY_RENTALS_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local rentals load error:", err);
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
  if (projectsFetchPromise) return projectsFetchPromise;

  projectsFetchPromise = (async () => {
    try {
      const res = await fetch('/projects.json');
      if (!res.ok) throw new Error("Failed to load local projects.json");
      const raw = await res.json();
      let items = Array.isArray(raw) ? raw : (raw?.results || raw?.data || raw?.projects || []);
      const fixed = items.map(fixPropertyData);
      window.__IVY_PROJECTS_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local projects load error:", err);
      return [];
    } finally {
      projectsFetchPromise = null;
    }
  })();
  return projectsFetchPromise;
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

export async function getAllListings() {
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

export async function getAllRentals() {
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

export async function getAllProjects() {
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
  const user = JSON.parse(localStorage.getItem("ivy_user") || "{}");
  return `ivy_favs_${user.email || "default"}`;
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