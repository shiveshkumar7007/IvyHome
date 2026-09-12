require("dotenv").config();

const fs = require("fs/promises");

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;

const EMAIL = "demo1@ivy.homes";
const LIMIT = 200;

async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}\n${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function fetchListings(accessToken, offset) {
  const url = new URL(`${BASE_URL}/v1/listings`);

  url.searchParams.set("limit", LIMIT);
  url.searchParams.set("offset", offset);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-API-Key": API_KEY,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Listings request failed: ${response.status}\n${JSON.stringify(data)}`
    );
  }

  return data;
}

async function main() {
  console.log("Logging in...");

  const accessToken = await login();

  console.log("Login successful.");
  console.log("Downloading listings...\n");

  let offset = 0;
  let total = null;
  const allListings = [];

  while (true) {
    console.log(`Fetching offset ${offset}...`);

    const data = await fetchListings(accessToken, offset);

    if (total === null) {
      total = data.total;
      console.log(`Total listings reported by API: ${total}\n`);
    }

    allListings.push(...data.results);

    console.log(
      `Received ${data.count} | Downloaded ${allListings.length}/${total}`
    );

    if (!data.has_more || data.count === 0) {
      break;
    }

    offset += data.count;
  }

  // Remove accidental duplicates by listing_id
  const uniqueListings = Array.from(
    new Map(
      allListings.map((listing) => [listing.listing_id, listing])
    ).values()
  );

  console.log("\nDownload complete.");
  console.log(`API total: ${total}`);
  console.log(`Downloaded: ${allListings.length}`);
  console.log(`Unique listings: ${uniqueListings.length}`);

  if (uniqueListings.length !== total) {
    console.warn(
      `WARNING: unique listing count (${uniqueListings.length}) does not match API total (${total})`
    );
  }

  await fs.mkdir("data", { recursive: true });

  await fs.writeFile(
    "data/listings.json",
    JSON.stringify(
      {
        downloaded_at: new Date().toISOString(),
        total_from_api: total,
        downloaded_count: allListings.length,
        unique_count: uniqueListings.length,
        results: uniqueListings,
      },
      null,
      2
    )
  );

  console.log("\nSaved to:");
  console.log("data/listings.json");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error.message);
  process.exit(1);
});