require("dotenv").config();

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

const EMAIL = "demo1@ivy.homes";
const LOCALITY = "kharadi";

const REFERENCE = new Date("2026-09-10T00:00:00+05:30");

const data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "data", "listings.json"),
    "utf8"
  )
);

const listings = Array.isArray(data) ? data : data.results;

if (!Array.isArray(listings)) {
  throw new Error("Could not load listings array.");
}

/* =========================================================
   HELPERS
========================================================= */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getListingId(listing) {
  return listing.listing_id || listing.id;
}

function getProjectId(project) {
  return project.project_id || project.id;
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

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isMagListing(listing) {
  return String(getListingId(listing) || "").startsWith("MAG-");
}

function areaInSqFt(listing, field) {
  const raw = safeNumber(listing[field]);

  if (raw === null) return null;

  if (isMagListing(listing)) {
    return raw * 10.764;
  }

  return raw;
}

function getPricePerSqft(listing) {
  const price = safeNumber(listing.price);

  if (price === null || price <= 0) return null;

  const carpetArea = areaInSqFt(listing, "carpet_area");

  if (carpetArea === null || carpetArea <= 0) return null;

  return price / carpetArea;
}

function isActive(listing) {
  return (
    listing.is_live === true ||
    listing.is_live === 1 ||
    String(listing.is_live).toLowerCase() === "true" ||
    String(listing.is_live) === "1"
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
    throw new Error(
      `Login failed: ${response.status} ${text}`
    );
  }

  const result = JSON.parse(text);

  return result.access_token || result.token;
}

/* =========================================================
   GENERIC API REQUEST
========================================================= */

async function apiRequest(endpoint, token, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
    text,
  };
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
      throw new Error(
        `${endpoint} failed: ${response.status} ${text}`
      );
    }

    const body = JSON.parse(text);

    const results = getResults(body);

    records.push(...results);

    console.log(
      `${endpoint} offset=${offset} count=${results.length}`
    );

    if (results.length < limit) {
      break;
    }

    if (body.has_more === false) {
      break;
    }

    offset += limit;

    await sleep(50);
  }

  return records;
}

/* =========================================================
   DATA QUALITY
========================================================= */

function getCorruptionReasons(listing) {
  const reasons = [];

  const price = safeNumber(listing.price);

  if (price !== null && price < 0) {
    reasons.push("negative_price");
  }

  const carpet = areaInSqFt(listing, "carpet_area");
  const superBuilt = areaInSqFt(
    listing,
    "super_built_up_area"
  );

  if (
    carpet !== null &&
    superBuilt !== null &&
    carpet > superBuilt
  ) {
    reasons.push("carpet_area_greater_than_super_built_up_area");
  }

  const floor = safeNumber(listing.floor);
  const totalFloors = safeNumber(listing.total_floors);

  if (
    floor !== null &&
    totalFloors !== null &&
    totalFloors > 0 &&
    floor > totalFloors
  ) {
    reasons.push("floor_greater_than_total_floors");
  }

  return reasons;
}

function isCorrupt(listing) {
  return getCorruptionReasons(listing).length > 0;
}

function getFakeMatches(listing) {
  const description = String(
    listing.description || ""
  ).toLowerCase();

  const phrases = [
    "booking amount",
    "token amount",
    "site visit only after",
  ];

  return phrases.filter((phrase) =>
    description.includes(phrase)
  );
}

function isFake(listing) {
  return getFakeMatches(listing).length > 0;
}

/* =========================================================
   PROPERTY UNIQUENESS
========================================================= */

function propertyKey(listing) {
  return `${listing.latitude}:${listing.longitude}`;
}

/* =========================================================
   AUTHENTICATION EVIDENCE
========================================================= */

async function collectAuthEvidence() {
  console.log("\n=================================");
  console.log("EVIDENCE: AUTHENTICATION");
  console.log("=================================");

  const body = JSON.stringify({
    email: EMAIL,
    password: DEMO_PASSWORD,
  });

  /*
    Documentation says API key is a query parameter.

    Test the documented form WITHOUT X-API-Key header.
  */

  const queryUrl = new URL(`${BASE_URL}/auth/login`);
  queryUrl.searchParams.set("api_key", API_KEY);

  const documented = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const documentedText = await documented.text();

  /*
    Actual working form: X-API-Key header.
  */

  const actual = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body,
  });

  const actualText = await actual.text();

  console.log(
    `Query parameter status: ${documented.status}`
  );

  console.log(
    `X-API-Key header status: ${actual.status}`
  );

  return {
    documented_query_parameter: {
      method: "POST",
      endpoint: "/auth/login?api_key={API_KEY}",
      status: documented.status,
      response: documentedText,
    },

    actual_header: {
      method: "POST",
      endpoint: "/auth/login",
      header: "X-API-Key",
      status: actual.status,
      response: actualText,
    },

    discrepancy:
      documented.status !== actual.status,
  };
}

/* =========================================================
   PAGINATION EVIDENCE
========================================================= */

async function collectPaginationEvidence(token) {
  console.log("\n=================================");
  console.log("EVIDENCE: PAGINATION");
  console.log("=================================");

  const pageUrl = new URL(`${BASE_URL}/v1/listings`);
  pageUrl.searchParams.set("page", "1");
  pageUrl.searchParams.set("limit", "2");

  const pageResponse = await fetch(pageUrl, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const pageText = await pageResponse.text();

  const offset0Url = new URL(`${BASE_URL}/v1/listings`);
  offset0Url.searchParams.set("offset", "0");
  offset0Url.searchParams.set("limit", "2");

  const offset0Response = await fetch(offset0Url, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const offset0Text = await offset0Response.text();

  const offset2Url = new URL(`${BASE_URL}/v1/listings`);
  offset2Url.searchParams.set("offset", "2");
  offset2Url.searchParams.set("limit", "2");

  const offset2Response = await fetch(offset2Url, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const offset2Text = await offset2Response.text();

  console.log(`page=1 status: ${pageResponse.status}`);
  console.log(`offset=0 status: ${offset0Response.status}`);
  console.log(`offset=2 status: ${offset2Response.status}`);

  return {
    documented_page_parameter: {
      endpoint: "/v1/listings?page=1&limit=2",
      status: pageResponse.status,
      response: pageText,
    },

    undocumented_offset_parameter: {
      endpoint: "/v1/listings?offset=0&limit=2",
      status: offset0Response.status,
      response: offset0Text,
    },

    second_offset_page: {
      endpoint: "/v1/listings?offset=2&limit=2",
      status: offset2Response.status,
      response: offset2Text,
    },
  };
}

/* =========================================================
   ANALYTICS EVIDENCE
========================================================= */

async function collectAnalyticsEvidence(token) {
  console.log("\n=================================");
  console.log("EVIDENCE: ANALYTICS");
  console.log("=================================");

  const result = await apiRequest(
    "/v1/analytics/summary",
    token
  );

  console.log(
    `GET /v1/analytics/summary status: ${result.status}`
  );

  console.log(
    "Response:",
    JSON.stringify(result.body, null, 2)
  );

  return {
    endpoint: "/v1/analytics/summary",
    status: result.status,
    response: result.body,
  };
}

/* =========================================================
   LISTING DETAIL EVIDENCE
========================================================= */

async function collectListingDetailEvidence(token) {
  console.log("\n=================================");
  console.log("EVIDENCE: LISTING DETAIL");
  console.log("=================================");

  /*
    Use an actual listing ID from the API/local dataset.
  */

  const listingId = getListingId(listings[0]);

  const singular = await apiRequest(
    `/v1/listing/${encodeURIComponent(listingId)}`,
    token
  );

  const plural = await apiRequest(
    `/v1/listings/${encodeURIComponent(listingId)}`,
    token
  );

  console.log(
    `Documented singular route: ${singular.status}`
  );

  console.log(
    `Plural route: ${plural.status}`
  );

  return {
    listing_id: listingId,

    documented_singular_route: {
      endpoint: `/v1/listing/${listingId}`,
      status: singular.status,
      response: singular.body,
    },

    actual_plural_route: {
      endpoint: `/v1/listings/${listingId}`,
      status: plural.status,
      response: plural.body,
    },
  };
}

/* =========================================================
   FAVOURITES EVIDENCE
========================================================= */

async function collectFavouriteEvidence(token) {
  console.log("\n=================================");
  console.log("EVIDENCE: FAVOURITES");
  console.log("=================================");

  /*
    IMPORTANT:
    Use an ID that actually exists in the live API,
    rather than assuming listings.json is identical.
  */

  const listingResponse = await apiRequest(
    "/v1/listings?limit=1&page=1",
    token
  );

  const liveListings = getResults(listingResponse.body);

  const listing =
    liveListings[0] || listings[0];

  const listingId = getListingId(listing);

  const documented = await apiRequest(
    "/v1/favourites",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        id: listingId,
      }),
    }
  );

  await sleep(100);

  const actual = await apiRequest(
    "/v1/favourites",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        listing_id: listingId,
      }),
    }
  );

  console.log(
    `Documented {id} status: ${documented.status}`
  );

  console.log(
    `Actual {listing_id} status: ${actual.status}`
  );

  /*
    Cleanup if either POST succeeded.
  */

  if (documented.ok || actual.ok) {
    await apiRequest(
      `/v1/favourites/${encodeURIComponent(listingId)}`,
      token,
      {
        method: "DELETE",
      }
    );
  }

  return {
    listing_id: listingId,

    documented_body: {
      body: {
        id: listingId,
      },
      status: documented.status,
      response: documented.body,
    },

    actual_body: {
      body: {
        listing_id: listingId,
      },
      status: actual.status,
      response: actual.body,
    },

    /*
      We only call this a body-name discrepancy when
      the documented body fails and the listing_id body succeeds.
    */

    body_name_discrepancy:
      documented.status !== 200 &&
      actual.status >= 200 &&
      actual.status < 300,
  };
}

/* =========================================================
   MAG AREA EVIDENCE
========================================================= */

function collectMagAreaEvidence() {
  console.log("\n=================================");
  console.log("EVIDENCE: MAG AREA UNITS");
  console.log("=================================");

  const examples = listings
    .filter(isMagListing)
    .filter(
      (x) =>
        safeNumber(x.carpet_area) !== null ||
        safeNumber(x.super_built_up_area) !== null
    )
    .slice(0, 10)
    .map((listing) => {
      const rawCarpet = safeNumber(
        listing.carpet_area
      );

      const rawSuperBuilt = safeNumber(
        listing.super_built_up_area
      );

      return {
        listing_id: getListingId(listing),

        documented_unit:
          "square feet according to API documentation",

        raw_carpet_area: rawCarpet,

        raw_super_built_up_area:
          rawSuperBuilt,

        interpreted_carpet_area_sqft:
          rawCarpet === null
            ? null
            : Number(
                (rawCarpet * 10.764).toFixed(2)
              ),

        interpreted_super_built_up_area_sqft:
          rawSuperBuilt === null
            ? null
            : Number(
                (rawSuperBuilt * 10.764).toFixed(2)
              ),

        conversion:
          "raw MAG area × 10.764 = square feet",
      };
    });

  for (const example of examples) {
    console.log(
      JSON.stringify(example, null, 2)
    );
  }

  return examples;
}

/* =========================================================
   PROJECT PRICE EVIDENCE
========================================================= */

function collectProjectPriceEvidence(projects) {
  console.log("\n=================================");
  console.log("EVIDENCE: PROJECT PRICE UNITS");
  console.log("=================================");

  const examples = projects
    .filter((project) => {
      const min = safeNumber(project.price_min);
      const max = safeNumber(project.price_max);

      return (
        (min !== null && min > 0 && min < 100000) ||
        (max !== null && max > 0 && max < 100000)
      );
    })
    .slice(0, 10)
    .map((project) => {
      const rawMin = safeNumber(project.price_min);
      const rawMax = safeNumber(project.price_max);

      return {
        project_id: getProjectId(project),

        raw_price_min: rawMin,
        raw_price_max: rawMax,

        interpreted_price_min_inr:
          rawMin === null
            ? null
            : rawMin * 100000,

        interpreted_price_max_inr:
          rawMax === null
            ? null
            : rawMax * 100000,

        conversion:
          "raw project price × 100000 = INR",
      };
    });

  /*
    Always explicitly include P30394 if available.
  */

  const p30394 = projects.find(
    (project) =>
      getProjectId(project) === "P30394"
  );

  if (
    p30394 &&
    !examples.some(
      (x) => x.project_id === "P30394"
    )
  ) {
    const rawMax = safeNumber(
      p30394.price_max
    );

    examples.push({
      project_id: "P30394",

      raw_price_min:
        safeNumber(p30394.price_min),

      raw_price_max: rawMax,

      interpreted_price_min_inr:
        safeNumber(p30394.price_min) === null
          ? null
          : safeNumber(p30394.price_min) *
            100000,

      interpreted_price_max_inr:
        rawMax === null
          ? null
          : rawMax * 100000,

      conversion:
        "raw project price × 100000 = INR",
    });
  }

  for (const example of examples) {
    console.log(
      JSON.stringify(example, null, 2)
    );
  }

  return examples;
}

/* =========================================================
   CORRUPT LISTING EVIDENCE
========================================================= */

function collectCorruptEvidence() {
  console.log("\n=================================");
  console.log("EVIDENCE: CORRUPT LISTINGS");
  console.log("=================================");

  const evidence = listings
    .filter(isCorrupt)
    .slice(0, 20)
    .map((listing) => {
      const rawCarpet = safeNumber(
        listing.carpet_area
      );

      const rawSuperBuilt = safeNumber(
        listing.super_built_up_area
      );

      return {
        listing_id: getListingId(listing),

        reasons:
          getCorruptionReasons(listing),

        price: listing.price,

        floor: listing.floor,

        total_floors: listing.total_floors,

        carpet_area_raw: rawCarpet,

        super_built_up_area_raw:
          rawSuperBuilt,

        carpet_area_sqft:
          rawCarpet === null
            ? null
            : Number(
                areaInSqFt(
                  listing,
                  "carpet_area"
                ).toFixed(2)
              ),

        super_built_up_area_sqft:
          rawSuperBuilt === null
            ? null
            : Number(
                areaInSqFt(
                  listing,
                  "super_built_up_area"
                ).toFixed(2)
              ),
      };
    });

  for (const item of evidence) {
    console.log(
      JSON.stringify(item, null, 2)
    );
  }

  return evidence;
}

/* =========================================================
   FAKE LISTING EVIDENCE
========================================================= */

function collectFakeEvidence() {
  console.log("\n=================================");
  console.log("EVIDENCE: FAKE LISTINGS");
  console.log("=================================");

  const evidence = listings
    .filter(isFake)
    .slice(0, 20)
    .map((listing) => ({
      listing_id: getListingId(listing),

      matched_phrases:
        getFakeMatches(listing),

      description:
        listing.description || "",
    }));

  for (const item of evidence) {
    console.log(
      JSON.stringify(item, null, 2)
    );
  }

  return evidence;
}

/* =========================================================
   PROJECT COUNT EVIDENCE
========================================================= */

function collectProjectCountEvidence(
  projects,
  activeListings
) {
  console.log("\n=================================");
  console.log("EVIDENCE: PROJECT COUNTS");
  console.log("=================================");

  const projectListingCounts =
    new Map();

  for (const listing of activeListings) {
    if (!listing.project_id) continue;

    const current =
      projectListingCounts.get(
        listing.project_id
      ) || 0;

    projectListingCounts.set(
      listing.project_id,
      current + 1
    );
  }

  const evidence = [];

  for (const project of projects) {
    const projectId =
      getProjectId(project);

    const actualCount =
      projectListingCounts.get(
        projectId
      ) || 0;

    const reportedCount =
      safeNumber(
        project.total_listings ??
          project.listing_count
      ) ?? 0;

    if (actualCount !== reportedCount) {
      evidence.push({
        project_id: projectId,

        reported_count:
          reportedCount,

        actual_active_listing_count:
          actualCount,
      });
    }
  }

  const first20 = evidence.slice(0, 20);

  for (const item of first20) {
    console.log(
      JSON.stringify(item, null, 2)
    );
  }

  return {
    total_mismatches: evidence.length,
    evidence: first20,
  };
}

/* =========================================================
   DATASET LICENSE EVIDENCE
========================================================= */

function collectDatasetLicenseEvidence() {
  console.log("\n=================================");
  console.log("EVIDENCE: DATASET LICENSE");
  console.log("=================================");

  const matches = [];

  const patterns = [
    "data certified by 100acres",
    "100a-26ed67",
  ];

  for (const listing of listings) {
    const text = JSON.stringify(
      listing
    ).toLowerCase();

    const matched = patterns.filter(
      (pattern) =>
        text.includes(pattern)
    );

    if (matched.length > 0) {
      matches.push({
        listing_id:
          getListingId(listing),

        matched_terms: matched,

        description:
          listing.description || "",
      });
    }

    if (matches.length >= 20) {
      break;
    }
  }

  for (const item of matches) {
    console.log(
      JSON.stringify(item, null, 2)
    );
  }

  return matches;
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  console.log("=================================");
  console.log("IVY HOMES API AUDIT");
  console.log("=================================");

  console.log(
    `Reference: ${REFERENCE.toISOString()}`
  );

  console.log(
    `Listings loaded: ${listings.length}`
  );

  /* -------------------------------------------------------
     LOGIN
  ------------------------------------------------------- */

  console.log("\n=================================");
  console.log("LOGIN");
  console.log("=================================");

  console.log("POST /auth/login");

  const token = await login();

  console.log("Status: 200");
  console.log("Login successful.");

  /* -------------------------------------------------------
     RENTALS
  ------------------------------------------------------- */

  console.log("\n=================================");
  console.log("FETCHING RENTALS");
  console.log("=================================");

  const rentals = await fetchAll(
    "/v1/rentals",
    token
  );

  console.log(
    `Total rentals fetched: ${rentals.length}`
  );

  /* -------------------------------------------------------
     PROJECTS
  ------------------------------------------------------- */

  console.log("\n=================================");
  console.log("FETCHING PROJECTS");
  console.log("=================================");

  const projects = await fetchAll(
    "/v1/projects",
    token
  );

  console.log(
    `Total projects fetched: ${projects.length}`
  );

  /* -------------------------------------------------------
     Q1 UNIQUE PROPERTIES
  ------------------------------------------------------- */

  const propertySet = new Set();

  for (const listing of listings) {
    propertySet.add(
      propertyKey(listing)
    );
  }

  const uniqueProperties =
    propertySet.size;

  /* -------------------------------------------------------
     Q3 ACTIVE
  ------------------------------------------------------- */

  const activeListings =
    listings.filter(isActive);

  /* -------------------------------------------------------
     Q4 CORRUPT
  ------------------------------------------------------- */

  const corruptListings =
    listings.filter(isCorrupt);

  const corruptIds =
    corruptListings.map(getListingId);

  /* -------------------------------------------------------
     Q5 RENT
  ------------------------------------------------------- */

  const totalMonthlyRent =
    rentals
      .filter(
        (rental) =>
          String(
            rental.locality || ""
          ).toLowerCase() === LOCALITY
      )
      .reduce((sum, rental) => {
        const rent = safeNumber(
          rental.monthly_rent ??
            rental.price
        );

        return sum + (rent || 0);
      }, 0);

  /* -------------------------------------------------------
     Q6 AVG PRICE / SQFT FOR 2BHK
  ------------------------------------------------------- */

  const twoBhk =
    activeListings.filter(
      (listing) => {
        const bedroom =
          safeNumber(
            listing.bedroom
          );

        const price =
          safeNumber(
            listing.price
          );

        const area =
          areaInSqFt(
            listing,
            "carpet_area"
          );

        return (
          bedroom === 2 &&
          price !== null &&
          price > 0 &&
          area !== null &&
          area > 0
        );
      }
    );

  const averagePricePerSqft =
    twoBhk.length === 0
      ? 0
      : twoBhk.reduce(
          (sum, listing) => {
            return (
              sum +
              getPricePerSqft(
                listing
              )
            );
          },
          0
        ) / twoBhk.length;

  /* -------------------------------------------------------
     Q7 COSTLIEST PROJECT
  ------------------------------------------------------- */

  const normalizedProjects =
    projects.map((project) => {
      const rawMax =
        safeNumber(
          project.price_max
        );

      const normalizedMax =
        rawMax !== null &&
        rawMax > 0 &&
        rawMax < 100000
          ? rawMax * 100000
          : rawMax;

      return {
        ...project,
        normalized_price_max_inr:
          normalizedMax,
      };
    });

  const costliestProject =
    normalizedProjects.reduce(
      (best, project) => {
        if (
          !best ||
          project.normalized_price_max_inr >
            best.normalized_price_max_inr
        ) {
          return project;
        }

        return best;
      },
      null
    );

  const costliestProjectAnswer =
    costliestProject
      ? {
          project_id:
            getProjectId(
              costliestProject
            ),

          price_max_inr:
            costliestProject
              .normalized_price_max_inr,
        }
      : null;

  /* -------------------------------------------------------
     Q8 LAST 7 DAYS
  ------------------------------------------------------- */

  const sevenDaysAgo =
    new Date(
      REFERENCE.getTime() -
        7 * 24 * 60 * 60 * 1000
    );

  const lastSevenDays =
    listings.filter((listing) => {
      const rawDate =
        listing.created_at ||
        listing.createdAt ||
        listing.posted_at ||
        listing.postedAt;

      if (!rawDate) return false;

      const date =
        new Date(rawDate);

      return (
        date >= sevenDaysAgo &&
        date < REFERENCE
      );
    });

  /* -------------------------------------------------------
     Q9 FAKE
  ------------------------------------------------------- */

  const fakeListings =
    listings.filter(isFake);

  const fakeIds =
    fakeListings.map(getListingId);

  /* -------------------------------------------------------
     Q10 PROJECT COUNT
  ------------------------------------------------------- */

  const projectListingCounts =
    new Map();

  for (const listing of activeListings) {
    if (!listing.project_id) continue;

    projectListingCounts.set(
      listing.project_id,
      (projectListingCounts.get(
        listing.project_id
      ) || 0) + 1
    );
  }

  let projectsWithWrongListingCount =
    0;

  for (const project of projects) {
    const id =
      getProjectId(project);

    const actualCount =
      projectListingCounts.get(id) ||
      0;

    const reportedCount =
      safeNumber(
        project.total_listings ??
          project.listing_count
      ) ?? 0;

    if (
      actualCount !==
      reportedCount
    ) {
      projectsWithWrongListingCount++;
    }
  }

  /* =======================================================
     EVIDENCE COLLECTION
  ======================================================= */

  const authEvidence =
    await collectAuthEvidence();

  const paginationEvidence =
    await collectPaginationEvidence(
      token
    );

  const analyticsEvidence =
    await collectAnalyticsEvidence(
      token
    );

  const listingDetailEvidence =
    await collectListingDetailEvidence(
      token
    );

  const favouriteEvidence =
    await collectFavouriteEvidence(
      token
    );

  const magAreaEvidence =
    collectMagAreaEvidence();

  const projectPriceEvidence =
    collectProjectPriceEvidence(
      projects
    );

  const corruptEvidence =
    collectCorruptEvidence();

  const fakeEvidence =
    collectFakeEvidence();

  const projectCountEvidence =
    collectProjectCountEvidence(
      projects,
      activeListings
    );

  const datasetLicenseEvidence =
    collectDatasetLicenseEvidence();

  /* =======================================================
     ANSWERS
  ======================================================= */

  const answers = {
    total_listing_records:
      listings.length,

    unique_properties:
      uniqueProperties,

    active_listings:
      activeListings.length,

    corrupt_listing_ids:
      corruptIds,

    total_monthly_rent:
      totalMonthlyRent,

    avg_price_per_sqft_2bhk:
      Number(
        averagePricePerSqft.toFixed(2)
      ),

    costliest_project:
      costliestProjectAnswer,

    listings_last_7_days:
      lastSevenDays.length,

    fake_listing_ids:
      fakeIds,

    projects_with_wrong_listing_count:
      projectsWithWrongListingCount,
  };

  console.log("\n=================================");
  console.log("FINAL ANSWERS");
  console.log("=================================");

  console.log(
    JSON.stringify(
      answers,
      null,
      2
    )
  );

  /* =======================================================
     SAVE ANSWERS
  ======================================================= */

  fs.writeFileSync(
    path.join(
      __dirname,
      "analysis-results.json"
    ),
    JSON.stringify(
      answers,
      null,
      2
    )
  );

  /* =======================================================
     SAVE COMPLETE EVIDENCE
  ======================================================= */

  const evidence = {
    reference:
      "2026-09-10T00:00:00+05:30",

    authentication:
      authEvidence,

    pagination:
      paginationEvidence,

    analytics:
      analyticsEvidence,

    listing_detail:
      listingDetailEvidence,

    favourites:
      favouriteEvidence,

    mag_area_units:
      magAreaEvidence,

    project_price_units:
      projectPriceEvidence,

    corrupt_listings: {
      total:
        corruptListings.length,

      evidence:
        corruptEvidence,
    },

    fake_listings: {
      total:
        fakeListings.length,

      evidence:
        fakeEvidence,
    },

    project_listing_counts:
      projectCountEvidence,

    dataset_license:
      datasetLicenseEvidence,
  };

  fs.writeFileSync(
    path.join(
      __dirname,
      "evidence.json"
    ),
    JSON.stringify(
      evidence,
      null,
      2
    )
  );

  /* =======================================================
     SAVE PROJECT COUNT EVIDENCE
  ======================================================= */

  fs.writeFileSync(
    path.join(
      __dirname,
      "wrong-project-counts.json"
    ),
    JSON.stringify(
      projectCountEvidence,
      null,
      2
    )
  );

  /* =======================================================
     SAVE DATA QUALITY EVIDENCE
  ======================================================= */

  fs.writeFileSync(
    path.join(
      __dirname,
      "data-quality-evidence.json"
    ),
    JSON.stringify(
      {
        corrupt: {
          total:
            corruptListings.length,

          ids:
            corruptIds,

          evidence:
            corruptEvidence,
        },

        fake: {
          total:
            fakeListings.length,

          ids:
            fakeIds,

          evidence:
            fakeEvidence,
        },
      },
      null,
      2
    )
  );

  /* =======================================================
     SUMMARY
  ======================================================= */

  console.log(
    "\n================================="
  );
  console.log(
    "EVIDENCE SUMMARY"
  );
  console.log(
    "================================="
  );

  console.log(
    `Auth query parameter status: ${authEvidence.documented_query_parameter.status}`
  );

  console.log(
    `Auth header status: ${authEvidence.actual_header.status}`
  );

  console.log(
    `Analytics status: ${analyticsEvidence.status}`
  );

  console.log(
    `Listing detail documented route: ${listingDetailEvidence.documented_singular_route.status}`
  );

  console.log(
    `Listing detail plural route: ${listingDetailEvidence.actual_plural_route.status}`
  );

  console.log(
    `Favourite documented body: ${favouriteEvidence.documented_body.status}`
  );

  console.log(
    `Favourite actual body: ${favouriteEvidence.actual_body.status}`
  );

  console.log(
    `MAG area evidence records: ${magAreaEvidence.length}`
  );

  console.log(
    `Project price evidence records: ${projectPriceEvidence.length}`
  );

  console.log(
    `Corrupt records: ${corruptListings.length}`
  );

  console.log(
    `Fake records: ${fakeListings.length}`
  );

  console.log(
    `Project count mismatches: ${projectsWithWrongListingCount}`
  );

  console.log(
    `Dataset license matches: ${datasetLicenseEvidence.length}`
  );

  console.log("\nSaved:");
  console.log("  analysis-results.json");
  console.log("  evidence.json");
  console.log("  wrong-project-counts.json");
  console.log("  data-quality-evidence.json");
}

main().catch((error) => {
  console.error("\nAUDIT FAILED");
  console.error(error);
  process.exit(1);
});