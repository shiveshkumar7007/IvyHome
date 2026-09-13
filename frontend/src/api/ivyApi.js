// import { fixPropertyData } from "../utils/helpers";

// let cachedDatabase = null;

// async function loadLocalDatabase() {
//   if (cachedDatabase && cachedDatabase.length > 0) {
//     return cachedDatabase;
//   }

//   // Check sessionStorage for ultra-fast persistent caching across page transitions
//   try {
//     const sessionCached = sessionStorage.getItem("ivy_local_db_cache");
//     if (sessionCached) {
//       const parsed = JSON.parse(sessionCached);
//       if (Array.isArray(parsed) && parsed.length > 0) {
//         cachedDatabase = parsed;
//         return cachedDatabase;
//       }
//     }
//   } catch (e) {
//     // Fallback on error
//   }

//   try {
//     const res = await fetch('/listings.json');
//     if (!res.ok) throw new Error("Failed to load local listings.json database");
//     const raw = await res.json();
    
//     let items = [];
//     if (Array.isArray(raw)) items = raw;
//     else items = raw?.results || raw?.data || raw?.listings || raw?.projects || raw?.rentals || raw?.items || [];
    
//     cachedDatabase = items.map(fixPropertyData);

//     // Save to sessionStorage for subsequent lightning-fast loads
//     try {
//       sessionStorage.setItem("ivy_local_db_cache", JSON.stringify(cachedDatabase));
//     } catch (e) {
//       // Storage safety limit
//     }

//     return cachedDatabase;
//   } catch (err) {
//     console.error("Local database load error:", err);
//     return [];
//   }
// }

// export async function isAuthenticated() {
//   return true;
// }

// export function getAccessToken() {
//   return "local-mock-token";
// }

// export function logout() {
//   window.location.href = "/login";
// }

// export async function login(email, password) {
//   return { access_token: "local-token", user: { email: email || "admin@ivy.homes" } };
// }

// export function extractItems(response) {
//   if (Array.isArray(response)) return response.map(fixPropertyData);
//   if (response && Array.isArray(response.results)) return response.results.map(fixPropertyData);
//   if (response && Array.isArray(response.data)) return response.data.map(fixPropertyData);
//   return [];
// }

// // --- Listings Database Layer ---
// export async function getListings(params = {}) {
//   const db = await loadLocalDatabase();
//   let results = [...db];

//   if (params.locality) {
//     const loc = params.locality.toLowerCase();
//     results = results.filter(item => String(item.locality || "").toLowerCase().includes(loc));
//   }
//   if (params.bedroom || params.bhk) {
//     const bhk = Number(params.bedroom || params.bhk);
//     results = results.filter(item => Number(item.bedroom) === bhk);
//   }

//   const limit = Number(params.limit);
//   const offset = Number(params.offset) || 0;
//   if (!isNaN(limit)) {
//     return results.slice(offset, offset + limit);
//   }

//   return results;
// }

// export async function getAllListings(params = {}) {
//   return loadLocalDatabase();
// }

// export async function getListing(id) {
//   const db = await loadLocalDatabase();
//   const found = db.find(item => String(item.listing_id || item.id) === String(id));
//   if (!found) throw new Error(`Listing not found: ${id}`);
//   return found;
// }

// // --- Rentals Database Layer ---
// export async function getRentals(params = {}) {
//   const db = await loadLocalDatabase();
//   let results = db.filter(item => {
//     const type = String(item.property_type || item.category || "").toLowerCase();
//     return type.includes('rent') || type.includes('lease') || Number(item.price) < 150000;
//   });
//   if (results.length === 0) results = db;

//   const limit = Number(params.limit);
//   const offset = Number(params.offset) || 0;
//   if (!isNaN(limit)) {
//     return results.slice(offset, offset + limit);
//   }

//   return results;
// }

// export async function getAllRentals(params = {}) {
//   const db = await loadLocalDatabase();
//   const rentals = db.filter(item => {
//     const type = String(item.property_type || item.category || "").toLowerCase();
//     return type.includes('rent') || type.includes('lease') || Number(item.price) < 150000;
//   });
//   return rentals.length > 0 ? rentals : db;
// }

// export async function getRental(id) {
//   return getListing(id);
// }

// // --- Projects Database Layer ---
// export async function getProjects(params = {}) {
//   const db = await loadLocalDatabase();
//   let results = db.filter(item => item.project_id || item.project_name);
//   if (results.length === 0) results = db;

//   const limit = Number(params.limit);
//   const offset = Number(params.offset) || 0;
//   if (!isNaN(limit)) {
//     return results.slice(offset, offset + limit);
//   }

//   return results;
// }

// export async function getAllProjects(params = {}) {
//   const db = await loadLocalDatabase();
//   const projects = db.filter(item => item.project_id || item.project_name);
//   return projects.length > 0 ? projects : db;
// }

// export async function getProject(id) {
//   return getListing(id);
// }

// // --- Favourites / Favorites Management ---
// function getUserFavKey() {
//   return `ivy_favs_local`;
// }

// export async function getFavourites() {
//   try {
//     const favs = JSON.parse(localStorage.getItem(getUserFavKey()) || "[]");
//     return favs.map(fixPropertyData);
//   } catch {
//     return [];
//   }
// }
// export const getFavorites = getFavourites;

// export async function addFavourite(listingId) {
//   const db = await loadLocalDatabase();
//   const key = getUserFavKey();
//   const favs = JSON.parse(localStorage.getItem(key) || "[]");
  
//   if (!favs.find(f => String(f.listing_id || f.id || f.project_id) === String(listingId))) {
//     const item = db.find(f => String(f.listing_id || f.id || f.project_id) === String(listingId));
//     if (item) {
//       favs.push(item);
//       localStorage.setItem(key, JSON.stringify(favs));
//     }
//   }
//   return { success: true };
// }
// export const addFavorite = addFavourite;

// export async function removeFavourite(listingId) {
//   const key = getUserFavKey();
//   let favs = JSON.parse(localStorage.getItem(key) || "[]");
//   favs = favs.filter(f => String(f.listing_id || f.id || f.project_id) !== String(listingId));
//   localStorage.setItem(key, JSON.stringify(favs));
//   return { success: true };
// }
// export const removeFavorite = removeFavourite;

// // --- Insights / Analytics Summary ---
// export async function getInsights() {
//   const db = await loadLocalDatabase();
//   const prices = db.map(l => Number(l.price) || 0).filter(p => p > 0).sort((a, b) => a - b);
//   return {
//     total_listings: db.length,
//     median_price: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
//     median_price_per_sqft: 6500
//   };
// }

import { fixPropertyData } from "../utils/helpers";

// In-memory Promise lock to prevent parallel fetch triggers
let fetchPromise = null;

async function loadLocalDatabase() {
  // 1. If already in window memory, return instantly in 0ms
  if (window.__IVY_DB_CACHE__ && window.__IVY_DB_CACHE__.length > 0) {
    return window.__IVY_DB_CACHE__;
  }

  // 2. If a fetch is already underway, await it so we don't fetch twice
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('/listings.json');
      if (!res.ok) throw new Error("Failed to load local listings.json database");
      const raw = await res.json();
      
      let items = [];
      if (Array.isArray(raw)) items = raw;
      else items = raw?.results || raw?.data || raw?.listings || raw?.projects || raw?.rentals || raw?.items || [];
      
      const fixed = items.map(fixPropertyData);
      
      // Store globally in RAM
      window.__IVY_DB_CACHE__ = fixed;
      return fixed;
    } catch (err) {
      console.error("Local database load error:", err);
      return [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
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
  const db = await loadLocalDatabase();
  let results = db.filter(item => {
    const type = String(item.property_type || item.category || "").toLowerCase();
    return type.includes('rent') || type.includes('lease') || Number(item.price) < 150000;
  });
  if (results.length === 0) results = db;

  const limit = Number(params.limit);
  const offset = Number(params.offset) || 0;
  if (!isNaN(limit)) {
    return results.slice(offset, offset + limit);
  }

  return results;
}

export async function getAllRentals(params = {}) {
  const db = await loadLocalDatabase();
  const rentals = db.filter(item => {
    const type = String(item.property_type || item.category || "").toLowerCase();
    return type.includes('rent') || type.includes('lease') || Number(item.price) < 150000;
  });
  return rentals.length > 0 ? rentals : db;
}

export async function getRental(id) {
  return getListing(id);
}

// --- Projects Database Layer ---
export async function getProjects(params = {}) {
  const db = await loadLocalDatabase();
  let results = db.filter(item => item.project_id || item.project_name);
  if (results.length === 0) results = db;

  const limit = Number(params.limit);
  const offset = Number(params.offset) || 0;
  if (!isNaN(limit)) {
    return results.slice(offset, offset + limit);
  }

  return results;
}

export async function getAllProjects(params = {}) {
  const db = await loadLocalDatabase();
  const projects = db.filter(item => item.project_id || item.project_name);
  return projects.length > 0 ? projects : db;
}

export async function getProject(id) {
  return getListing(id);
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
  const key = getUserFavKey();
  const favs = JSON.parse(localStorage.getItem(key) || "[]");
  
  if (!favs.find(f => String(f.listing_id || f.id || f.project_id) === String(listingId))) {
    const item = db.find(f => String(f.listing_id || f.id || f.project_id) === String(listingId));
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
  favs = favs.filter(f => String(f.listing_id || f.id || f.project_id) !== String(listingId));
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