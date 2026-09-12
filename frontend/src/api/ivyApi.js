import { fixPropertyData } from "../utils/helpers";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

// --- Native Cookie Helpers ---
function setCookie(name, value, minutes) {
  let expires = "";
  if (minutes) {
    const date = new Date();
    date.setTime(date.getTime() + minutes * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}
// -----------------------------

export function isAuthenticated() {
  return !!getCookie("access_token");
}

export function getAccessToken() {
  return getCookie("access_token");
}

// Global Logout Function
export function logout() {
  eraseCookie("access_token");
  eraseCookie("user_email");
  // Force a hard redirect to clear all React state and return to login
  window.location.href = "/login";
}

// Centralized Request Interceptor
async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options.headers || {})
  };

  let token = getCookie("access_token");
  if (token) headers.Authorization = `Bearer ${token}`;

  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}api_key=${API_KEY}`;

  let response = await fetch(url, { ...options, headers });

  // If token is expired or invalid (401), force a clean logout
  if (response.status === 401) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

  if (!response.ok) throw new Error(data.detail || data.message || `Request failed: ${response.status}`);
  return data;
}

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // Set Access Token for exactly 24 hours (24 * 60 = 1440 minutes)
  setCookie("access_token", data.access_token || data.token, 1440);
  
  // Store user identifier to maintain isolated favourites for 24 hours
  if (data.user?.email || email) {
    setCookie("user_email", data.user?.email || email, 1440);
  }

  return data;
}

export async function getListings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/v1/listings?${query.toString()}`);
}

export async function getListing(id) {
  const data = await request(`/v1/listings/${encodeURIComponent(id)}`);
  return fixPropertyData(data);
}

export async function getRentals(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/v1/rentals?${query.toString()}`);
}

export async function getRental(id) {
  const data = await request(`/v1/rentals/${encodeURIComponent(id)}`);
  return fixPropertyData(data);
}

export async function getProjects(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return request(`/v1/projects?${query.toString()}`);
}

export async function getProject(id) {
  const data = await request(`/v1/projects/${encodeURIComponent(id)}`);
  return fixPropertyData(data);
}

// LocalStorage Favourites bound to the specific user's cookie
function getUserFavKey() {
  const email = getCookie("user_email") || 'guest';
  return `ivy_favs_${email}`;
}

export async function getFavourites() {
  const favs = JSON.parse(localStorage.getItem(getUserFavKey()) || "[]");
  return favs.map(fixPropertyData);
}

export async function addFavourite(listingId) {
  const key = getUserFavKey();
  const favs = JSON.parse(localStorage.getItem(key) || "[]");
  
  if (!favs.find(f => (f.listing_id || f.project_id || f.id) === listingId)) {
    let listingData;
    if (listingId.startsWith('P')) listingData = await getProject(listingId);
    else if (listingId.startsWith('R')) listingData = await getRental(listingId);
    else listingData = await getListing(listingId);
    
    favs.push(listingData);
    localStorage.setItem(key, JSON.stringify(favs));
  }
  return { success: true };
}

export async function removeFavourite(listingId) {
  const key = getUserFavKey();
  let favs = JSON.parse(localStorage.getItem(key) || "[]");
  favs = favs.filter(f => (f.listing_id || f.id || f.project_id) !== listingId);
  localStorage.setItem(key, JSON.stringify(favs));
  return { success: true };
}

export async function getInsights() {
  try { return await request("/v1/analytics/summary"); } 
  catch (error) { return {}; }
}

export function extractItems(response) {
  let items = [];
  if (Array.isArray(response)) items = response;
  else items = response?.results || response?.data || response?.listings || response?.projects || response?.rentals || response?.items || [];
  return items.map(fixPropertyData);
}