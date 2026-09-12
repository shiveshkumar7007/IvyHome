require("dotenv").config();

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
        throw new Error(JSON.stringify(data));
    }

    return data.access_token;
}

async function fetchPage(token, offset) {
    const url = new URL(`${BASE_URL}/v1/listings`);

    url.searchParams.set("limit", LIMIT);
    url.searchParams.set("offset", offset);

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-API-Key": API_KEY,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data;
}

async function main() {
    const token = await login();

    let offset = 0;
    let downloaded = 0;

    while (true) {
        const data = await fetchPage(token, offset);

        console.log({
            requested_offset: offset,
            returned_offset: data.offset,
            limit: data.limit,
            count: data.count,
            total: data.total,
            has_more: data.has_more,
            first_id: data.results[0]?.listing_id,
            last_id: data.results[data.results.length - 1]?.listing_id,
        });

        downloaded += data.count;

        if (!data.has_more || data.count === 0) {
            break;
        }

        offset += data.count;
    }

    console.log("\nFINAL");
    console.log("API total:", downloaded);
}

main().catch(console.error);