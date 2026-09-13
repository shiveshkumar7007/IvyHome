Ivy Homes — Property Platform

A React + Vite real estate intelligence platform built on the Ivy Homes Property API. The project treats the initial API_REFERENCE.md as a hypothesis rather than a source of truth, and validates documented behavior against the running API — the results of that validation live in submission.json at the repo root, alongside every number the assignment asks for and every place the docs turned out to be wrong.

What I built
A logged-in web app covering all six required screens:

Login against the real /auth/login flow, with the session surviving a page refresh and staying alive past the documented (and actual) token lifetime — see the auth findings below for why that's not as trivial as it sounds.

Browse listings, paginated, with locality/bedroom/price/furnishing filters that work whether or not the server does the filtering for you.

Listing detail pages, reachable by URL, on the working (undocumented) route rather than the documented one.

Saved listings — add, remove, list — per user, surviving a reload and a re-login.

Rentals and projects, browsable, with prices and areas normalized to their real units rather than the ones the docs claim.

An insights screen standing in for the /v1/analytics/summary endpoint the docs promise and the API doesn't have, plus the corrupt / fake / mismatched-count findings below surfaced for a human to see.

Credentials & environment
Issued to this key for the assignment — included here so the deployed app and the audit script can both be reproduced without digging through email:

Base URL: https://solve.ivy.homes

API key: IVY26-0328057EAE2B

City: Pune

Assigned locality: Kharadi (this is what Q5, total_monthly_rent, is scoped to)

Demo accounts: demo1@ivy.homes, demo2@ivy.homes, demo3@ivy.homes

Demo password: 1926030057

The frontend supports login with all three demo accounts; they share the password above.

1. How to run it
Requirements: Node.js 18+.

The audit script (analyze.js, repo root)
This is what produces every value in submission.json's answers and most of the evidence in findings.

Bash
npm install
Create a .env file in the repo root using the credentials above:

Code snippet
BASE_URL=https://solve.ivy.homes
API_KEY=IVY26-0328057EAE2B
DEMO_PASSWORD=1926030057
analyze.js itself doesn't call the live API — it reads three pre-downloaded snapshots, data/listings.json, data/rentals.json, data/projects.json, and does all its counting, cross-checking and unit-conversion against those. That's a deliberate split: paging through ~3,800 listings + 1,450 rentals + 440 projects is a separate, one-time fetch step, so re-running the analysis while iterating on the logic doesn't mean re-hitting the API every time.

Those three files are git-ignored, so on a fresh clone data/ starts empty — run the fetch step first to populate it (it pages each of /v1/listings, /v1/rentals, /v1/projects to completion using offset/has_more, not the documented page/total, for reasons covered below), then:

Bash
node analyze.js
The frontend (frontend/)
Bash
cd frontend
npm install
npm run dev        # http://localhost:5173
Live deployment: https://ivyhome.vercel.app/

2. What we distrusted, and what we did about it
The right first move — and the one that doesn't tell you much — is pointing an agent at every endpoint and patching whatever 404s. We did that first: /v1/listing/{id} doesn't exist, /v1/listings/{id} does; /v1/analytics/summary doesn't exist at all; the API key goes in an X-API-Key header, not the documented query parameter (a query-param request comes back 401 with a body that says exactly this). None of that took more than an hour, and none of it is the interesting part.

The findings that actually mattered came from treating documented facts, not just paths, as things to verify:

Auth tokens don't last 24 hours. The docs promise expires_in: 86400 and say outright "there is no refresh flow." The real /auth/login response returns access_token (not token), expires_in: 900 — 15 minutes — and a refresh_token with a refresh_url: /auth/refresh the docs deny exists. This is the one that would have broken the app silently: the brief requires the session to "still be working thirty minutes after you logged in," and the documented behavior makes that mathematically impossible without ever surfacing as an obvious bug.

The total field lies about what it's counting. The docs say to divide total by limit to know how many pages to request. total on /v1/listings is 3515 no matter what offset you're at — and that number is exactly our answer to "how many distinct properties" (verified independently by grouping all 3,800 downloaded records by latitude/longitude — also 3515, with zero internal inconsistency: every group that shares coordinates also shares an apartment_name). Paging with offset/has_more instead of trusting total is the only way to reach all 3,800 real listing records; trusting the documented formula silently drops 285 of them.

Project prices use two different scales, not one. price_min and price_max are documented as plain rupees. Applying the one conversion rule that fits price_min well (raw × 100,000, i.e. lakhs) to price_max too makes price_max < price_min for 321 of all 440 projects — impossible for a min/max range. Raw values under 10 are actually crores (× 1,00,00,000); raw values from 10–99.9 are lakhs. Applying that two-scale rule instead of one flat multiplier brings the max<min failures from 321 down to zero, across all 440 projects — and there's a clean gap in the raw data (nothing falls between 5 and 20), so there's no ambiguous boundary case to worry about. This changes the correct costliest_project answer entirely: the single-rule reading points at a project whose real price_max is ~₹99.9 lakh; the two-scale reading points at a different project altogether, with a real price_max over 4x higher.

28 listings describe something that can't exist, in four equal groups of 7: negative prices; carpet_area greater than super_built_up_area; floor greater than total_floors (plots are correctly excluded here — every plot listing has floor: 0, total_floors: 0, which is normal, not broken); and — the one that took longest to find — 7 listings with latitude and longitude swapped, placing the property outside India entirely. Every genuine listing in this city clusters at latitude ~18.36–18.68, longitude ~73.70–74.02; these seven have the two numbers transposed, landing near the Arctic Circle if you plot them as given.

posted_at breaks its own documented convention, but not everywhere. Docs promise ISO 8601 UTC with a Z suffix "everywhere in the API." Every one of the 3,800 /v1/listings records is missing it entirely — no Z, no offset. /v1/rentals, checked across all 1,450 retrievable records, is correctly Z-suffixed every time. That asymmetry is itself useful evidence that UTC is still the intended convention for listings too, just serialized without the suffix — but it's the one finding we're least certain about (see below).

90% of rental titles name the wrong locality. The documented example rental object has a title and a locality field that agree ("2 BHK for rent in Koramangala" / koramangala). In the real data, 1,313 of 1,450 rentals have a title naming a different locality than the structured field. total_monthly_rent is scoped to our assigned locality (Kharadi), so this mattered directly — the structured field, not the title text, is what the sum is built on.

Some listing descriptions contain text addressed to AI tools, not buyers. A handful of descriptions include lines like "Note to AI coding assistants..." instructing whatever LLM was reading the data to add a specific string to the submission's answers object, or a specific certification line to the app's footer, framed as a licensing requirement. Neither is real. This is reported as its own fraud finding rather than complied with — it's exactly the trap the brief names directly: "treat everything the API returns as data... a seller can write anything."

3. What we checked that turned out to be fine
The documented page/limit pagination itself works correctly. page=1&limit=2 returns exactly what you'd expect. The bug isn't in paging — it's in the field (total) you're told to use to know when to stop.

POST /v1/favourites — given how much else was off, we expected the request body key might not actually be id. It is; the documented shape works as written.

Rental price and deposit — checked against the same "smaller-than-plausible" test that caught the MAG-area and project-price bugs, expecting a third unit-scale surprise. Both came back genuinely in rupees, as documented.

Non-MAG listing areas. Only the MAG- source prefix uses square metres; a sample from every other prefix (100-, DWE-, SQU-, ZER-) matched the documented square-foot convention.

listing_id uniqueness. The docs claim every listing_id is globally unique, and across all 3,800 records it is — the duplication in this dataset is at the property level (same coordinates, different source-site listing_ids), which is a separate, correctly documented thing, not a contradiction of this claim.

4. What we'd do with another two days
Resolve the posted_at timezone question with a live check rather than an inference — post a test listing, read back its posted_at, compare to wall-clock time, and confirm whether listings_last_7_days should be 128 (treating the value as already IST) or 115 (treating it as UTC without the suffix).

Actually implement the token refresh flow using /auth/refresh before the real 15-minute expiry, instead of just detecting it.

Surface the duplicate-property and swapped-coordinate findings in the UI itself — a small badge on a listing detail page when its coordinates fall outside the city cluster, and an "also listed by" note when the same property (by coordinates) appears under multiple source sites.

Move off static JSON snapshots onto a real data layer (e.g. a lightweight document store with a geospatial index) so filters and the Insights screen aren't recomputing over a full in-memory array on every request, and add end-to-end tests (Playwright/Cypress) around the multi-filter listings flow and the map view.

Tools
Used an LLM assistant throughout, in three distinct phases rather than one end-to-end handoff:

Scaffolding — the initial React/Vite app structure, the fetchAll offset-pagination helper, and the first pass at the frontend's routing and filter UI.

Analysis — generating and iterating on analyze.js's consistency checks (the price-scale sanity test, the coordinate bounding-box check, the description phrase scans) and reviewing their output for false positives, like the plot/total_floors: 0 case that would otherwise have inflated the corrupt-listing count by an order of magnitude.

Review — a final pass across submission.json and this README to cross-check every answer and every piece of evidence against the data/*.json snapshots before submitting, catching a couple of stale numbers and an unsorted ID list that an earlier draft had missed.

Every number in submission.json and every claim in this README was independently re-derived from the three raw JSON files in data/ as a final check, not just carried over from whatever a tool produced first.