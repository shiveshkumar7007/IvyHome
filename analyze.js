require("dotenv").config();
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

const EMAIL = "demo1@ivy.homes";
const LOCALITY = "kharadi"; // Make sure this matches the locality in your email
const REFERENCE = new Date("2026-09-10T00:00:00+05:30");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "listings.json"), "utf8")
);

const listings = Array.isArray(data) ? data : data.results;

async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY 
    },
    body: JSON.stringify({
      email: EMAIL,
      password: DEMO_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  return result.access_token || result.token;
}

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
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(
        `${endpoint} failed: ${response.status} ${await response.text()}`
      );
    }

    const data = await response.json();
    const results = data.results || data.data || [];
    records.push(...results);

    console.log(`${endpoint} offset=${offset} count=${results.length}`);

    if (results.length < limit || !data.has_more) {
      break;
    }

    offset += limit; // Increment safely by limit chunk
  }

  return records;
}

function isCorrupt(listing) {
  const negativePrice = listing.price < 0;

  // Convert MAG- areas to sq ft for apples-to-apples logical comparisons
  let carpet = listing.carpet_area;
  let superBuilt = listing.super_built_up_area;
  if (listing.listing_id && listing.listing_id.startsWith("MAG-")) {
    carpet *= 10.764;
    superBuilt *= 10.764;
  }

  const invalidArea =
    Number.isFinite(carpet) &&
    Number.isFinite(superBuilt) &&
    carpet > superBuilt;

  const invalidFloor =
    listing.total_floors > 0 &&
    listing.floor > listing.total_floors;

  return negativePrice || invalidArea || invalidFloor;
}

function isFake(listing) {
  const description = String(listing.description || "").toLowerCase();

  return (
    description.includes("booking amount") ||
    description.includes("token amount") ||
    description.includes("site visit only after") // Added missing scam phrase
  );
}

function propertyKey(listing) {
  return `${listing.latitude}:${listing.longitude}`;
}

function parseDateIST(dateStr) {
  // If the string lacks a timezone, explicitly treat it as IST (+05:30)
  if (!dateStr.includes("Z") && !dateStr.includes("+")) {
    return new Date(dateStr + "+05:30").getTime();
  }
  return new Date(dateStr).getTime();
}

function getLastSevenDaysListings() {
  const end = REFERENCE.getTime();
  const start = end - 7 * 24 * 60 * 60 * 1000;

  return listings.filter((listing) => {
    if (!listing.posted_at) return false;
    const postedAt = parseDateIST(listing.posted_at);
    return postedAt >= start && postedAt < end;
  });
}

async function main() {
  if (!API_KEY || !DEMO_PASSWORD) {
    throw new Error("Missing API_KEY or DEMO_PASSWORD");
  }

  console.log(`Total records: ${listings.length}`);

  const corruptListings = listings.filter(isCorrupt);
  const corruptIds = corruptListings.map((l) => l.listing_id).sort();

  const fakeListings = listings.filter(isFake);
  const fakeIds = fakeListings.map((l) => l.listing_id).sort();

  const excludedIds = new Set([...corruptIds, ...fakeIds]);

  const uniqueProperties = new Set(listings.map(propertyKey)).size;

  const activeListings = listings.filter(
    (listing) => listing.is_live === true || listing.is_live === "true" || listing.is_live === 1
  );

  const lastSevenDays = getLastSevenDaysListings();

  const valid2BHK = activeListings.filter(
    (listing) =>
      Number(listing.bedroom) === 2 &&
      !excludedIds.has(listing.listing_id) &&
      listing.carpet_area > 0 &&
      listing.price > 0
  );

  const averagePricePerSqft =
    valid2BHK.length === 0
      ? 0
      : valid2BHK.reduce((sum, listing) => {
          // Area conversion applied strictly for calculation
          let sqft = listing.carpet_area;
          if (listing.listing_id.startsWith("MAG-")) {
            sqft = sqft * 10.764;
          }
          return sum + listing.price / sqft;
        }, 0) / valid2BHK.length;

  const token = await login();
  console.log("Login successful. Fetching Rentals & Projects...");

  const rentals = await fetchAll("/v1/rentals", token);
  const projects = await fetchAll("/v1/projects", token);

  const totalMonthlyRent = rentals
    .filter((rental) => String(rental.locality || "").toLowerCase() === LOCALITY)
    .reduce((sum, rental) => sum + Number(rental.price || rental.monthly_rent || 0), 0);

  let costliestProject = { project_id: "", price_max_inr: 0 };

  for (const project of projects) {
    let price = Number(project.price_max || 0);
    
    // Project price conversion (Lakhs to Rupees)
    if (price > 0 && price < 100000) {
      price = price * 100000;
    }

    if (price > costliestProject.price_max_inr) {
      costliestProject = {
        project_id: project.project_id || project.id,
        price_max_inr: price
      };
    }
  }

  const projectListingCounts = new Map();

  for (const listing of activeListings) {
    if (!listing.project_id) continue;
    const current = projectListingCounts.get(listing.project_id) || 0;
    projectListingCounts.set(listing.project_id, current + 1);
  }

  let projectsWithWrongListingCount = 0;

  for (const project of projects) {
    const id = project.project_id || project.id;
    const actualCount = projectListingCounts.get(id) || 0;
    const reportedCount = Number(project.total_listings || project.listing_count || 0);

    if (actualCount !== reportedCount) {
      projectsWithWrongListingCount++;
    }
  }

  const answers = {
    total_listing_records: listings.length,
    unique_properties: uniqueProperties,
    active_listings: activeListings.length,
    corrupt_listing_ids: corruptIds,
    total_monthly_rent: totalMonthlyRent,
    avg_price_per_sqft_2bhk: Number(averagePricePerSqft.toFixed(2)),
    costliest_project: costliestProject,
    listings_last_7_days: lastSevenDays.length,
    fake_listing_ids: fakeIds,
    projects_with_wrong_listing_count: projectsWithWrongListingCount
  };

  console.log("\nANSWERS");
  console.log(JSON.stringify(answers, null, 2));

  fs.writeFileSync(
    path.join(__dirname, "analysis-results.json"),
    JSON.stringify(answers, null, 2)
  );

  console.log("\nSaved to analysis-results.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});