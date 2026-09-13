require("dotenv").config();

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

const EMAIL = "demo1@ivy.homes";

/* =========================================================
   HELPERS
========================================================= */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return (
    data.results ||
    data.data ||
    data.listings ||
    data.projects ||
    data.rentals ||
    data.items ||
    []
  );
}

/* =========================================================
   AUTH
========================================================= */

async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: DEMO_PASSWORD,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${text}`);
  }

  const result = JSON.parse(text);
  return result.access_token || result.token;
}

/* =========================================================
   FETCH ALL COLLECTION RECORDS
========================================================= */

async function fetchAll(endpoint, token) {
  const records = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: {
        "X-API-Key": API_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${endpoint} failed: ${response.status} ${text}`);
    }

    const body = JSON.parse(text);
    const results = getResults(body);

    records.push(...results);

    console.log(`${endpoint} offset=${offset} count=${results.length}`);

    if (results.length < limit || body.has_more === false) {
      break;
    }

    offset += limit;
    await sleep(50);
  }

  return records;
}

/* =========================================================
   MAIN DOWNLOADER
========================================================= */

async function main() {
  console.log("=================================");
  console.log("DOWNLOADING DATASETS TO /data");
  console.log("=================================");

  const token = await login();
  console.log("Login successful. Authenticated.");

  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. Fetch & Save Rentals
  console.log("\nFetching /v1/rentals...");
  const rentals = await fetchAll("/v1/rentals", token);
  const rentalsPath = path.join(dataDir, "rentals.json");
  fs.writeFileSync(rentalsPath, JSON.stringify(rentals, null, 2));
  console.log(`Saved ${rentals.length} rentals to ${rentalsPath}`);

  // 2. Fetch & Save Projects
  console.log("\nFetching /v1/projects...");
  const projects = await fetchAll("/v1/projects", token);
  const projectsPath = path.join(dataDir, "projects.json");
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
  console.log(`Saved ${projects.length} projects to ${projectsPath}`);

  console.log("\n=================================");
  console.log("ALL DATASETS SAVED SUCCESSFULLY!");
  console.log("=================================");
}

main().catch((error) => {
  console.error("\nDOWNLOAD FAILED:", error);
  process.exit(1);
});