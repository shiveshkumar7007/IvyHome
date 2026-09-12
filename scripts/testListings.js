require("dotenv").config();

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;

async function login() {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        body: JSON.stringify({
            email: "demo1@ivy.homes",
            password: PASSWORD
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data.access_token;
}

async function testListings(token) {
    const response = await fetch(
        `${BASE_URL}/v1/listings?limit=5&page=1`,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
                "X-API-Key": API_KEY
            }
        }
    );

    console.log("Status:", response.status);

    const data = await response.json();

    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    try {
        const token = await login();

        console.log("Login successful.");
        console.log("Testing listings...");

        await testListings(token);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
