const fs = require("fs");

const filePath = "./data/listings.json";

const rawData = fs.readFileSync(filePath, "utf-8");
const data = JSON.parse(rawData);

// Support different possible JSON structures
const listings = Array.isArray(data)
  ? data
  : data.results || data.listings || [];

console.log("=================================");
console.log("IVYHOMES LISTING ANALYSIS");
console.log("=================================\n");

console.log("Total records:", listings.length);

// 1. ACTIVE LISTINGS

const activeListings = listings.filter(
  (listing) => listing.is_live === true
);

console.log("Active listings:", activeListings.length);

// 2. BASIC FIELD ANALYSIS

const fields = [
  "listing_id",
  "listing_url",
  "city_id",
  "apartment_name",
  "locality",
  "property_type",
  "bedroom",
  "bathroom",
  "balcony",
  "floor",
  "total_floors",
  "furnishing",
  "price",
  "carpet_area",
  "super_built_up_area",
  "latitude",
  "longitude",
  "project_id",
  "is_verified",
  "posted_at",
  "is_live",
];

console.log("\nMissing field counts:");

for (const field of fields) {
  const missing = listings.filter(
    (listing) =>
      listing[field] === undefined ||
      listing[field] === null ||
      listing[field] === ""
  ).length;

  console.log(`${field}: ${missing}`);
}

// 3. POTENTIALLY CORRUPT LISTINGS

const corruptListings = [];

for (const listing of listings) {
  const reasons = [];

  if (
    listing.price !== undefined &&
    listing.price !== null &&
    Number(listing.price) <= 0
  ) {
    reasons.push("invalid price");
  }

  if (
    listing.carpet_area !== undefined &&
    listing.carpet_area !== null &&
    Number(listing.carpet_area) <= 0
  ) {
    reasons.push("invalid carpet area");
  }

  if (
    listing.super_built_up_area !== undefined &&
    listing.super_built_up_area !== null &&
    Number(listing.super_built_up_area) <= 0
  ) {
    reasons.push("invalid super built-up area");
  }

  if (
    listing.bedroom !== undefined &&
    listing.bedroom !== null &&
    Number(listing.bedroom) < 0
  ) {
    reasons.push("negative bedroom count");
  }

  if (
    listing.bathroom !== undefined &&
    listing.bathroom !== null &&
    Number(listing.bathroom) < 0
  ) {
    reasons.push("negative bathroom count");
  }

  if (
    listing.floor !== undefined &&
    listing.floor !== null &&
    Number(listing.floor) < 0
  ) {
    reasons.push("negative floor");
  }

  if (
    listing.total_floors !== undefined &&
    listing.total_floors !== null &&
    Number(listing.total_floors) < 0
  ) {
    reasons.push("negative total floors");
  }

  if (
    listing.floor !== undefined &&
    listing.total_floors !== undefined &&
    listing.floor !== null &&
    listing.total_floors !== null &&
    Number(listing.floor) > Number(listing.total_floors)
  ) {
    reasons.push("floor greater than total floors");
  }

  if (
    listing.carpet_area &&
    listing.super_built_up_area &&
    Number(listing.carpet_area) > Number(listing.super_built_up_area)
  ) {
    reasons.push("carpet area greater than super built-up area");
  }

  if (reasons.length > 0) {
    corruptListings.push({
      listing_id: listing.listing_id,
      reasons,
    });
  }
}

console.log("\nPotentially corrupt listings:");
console.log("Count:", corruptListings.length);

console.table(corruptListings);

// 4. PROJECT COUNTS

const projectCounts = new Map();

for (const listing of listings) {
  if (!listing.project_id) continue;

  projectCounts.set(
    listing.project_id,
    (projectCounts.get(listing.project_id) || 0) + 1
  );
}

console.log("\nProjects:", projectCounts.size);

// Show largest projects
const largestProjects = [...projectCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log("\nTop 20 projects by listing count:");

console.table(
  largestProjects.map(([project_id, count]) => ({
    project_id,
    count,
  }))
);

// 5. PRICE STATISTICS

const pricedListings = listings.filter(
  (listing) =>
    Number.isFinite(Number(listing.price)) &&
    Number(listing.price) > 0
);

const prices = pricedListings.map((listing) => Number(listing.price));

const maxPrice = Math.max(...prices);
const minPrice = Math.min(...prices);

console.log("\nPrice statistics:");
console.log("Listings with valid price:", prices.length);
console.log("Minimum price:", minPrice);
console.log("Maximum price:", maxPrice);

// 6. 2 BHK PRICE / SQFT

const twoBhk = activeListings.filter(
  (listing) =>
    Number(listing.bedroom) === 2 &&
    Number(listing.price) > 0 &&
    Number(listing.carpet_area) > 0
);

const pricePerSqft = twoBhk.map((listing) => {
  return Number(listing.price) / Number(listing.carpet_area);
});

const avgPricePerSqft =
  pricePerSqft.length > 0
    ? pricePerSqft.reduce((sum, value) => sum + value, 0) /
      pricePerSqft.length
    : 0;

console.log("\n2 BHK:");
console.log("Valid 2 BHK listings:", twoBhk.length);
console.log(
  "Average price per sqft:",
  avgPricePerSqft.toFixed(2)
);

// 7. MOST EXPENSIVE LISTING

const mostExpensive = [...pricedListings].sort(
  (a, b) => Number(b.price) - Number(a.price)
)[0];

console.log("\nMost expensive listing:");

if (mostExpensive) {
  console.table({
    listing_id: mostExpensive.listing_id,
    project_id: mostExpensive.project_id,
    apartment_name: mostExpensive.apartment_name,
    locality: mostExpensive.locality,
    price: mostExpensive.price,
    bedroom: mostExpensive.bedroom,
    carpet_area: mostExpensive.carpet_area,
  });
}

// 8. DUPLICATE LISTING IDS

const listingIdMap = new Map();

for (const listing of listings) {
  const id = listing.listing_id;

  if (!id) continue;

  if (!listingIdMap.has(id)) {
    listingIdMap.set(id, []);
  }

  listingIdMap.get(id).push(listing);
}

const duplicateIds = [...listingIdMap.entries()]
  .filter(([_, records]) => records.length > 1)
  .map(([listing_id, records]) => ({
    listing_id,
    count: records.length,
  }));

console.log("\nDuplicate listing IDs:");
console.log("Count:", duplicateIds.length);

console.table(duplicateIds);

// FINAL SUMMARY

console.log("\n=================================");
console.log("SUMMARY");
console.log("=================================");

console.log("Total records:", listings.length);
console.log("Active listings:", activeListings.length);
console.log("Projects:", projectCounts.size);
console.log("Potential corrupt:", corruptListings.length);
console.log("Duplicate listing IDs:", duplicateIds.length);
console.log(
  "Average 2BHK price/sqft:",
  avgPricePerSqft.toFixed(2)
);