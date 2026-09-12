require("dotenv").config();

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;

async function testLogin() {
    try {
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

        console.log("Status:", response.status);

        const data = await response.json();

        if (!response.ok) {
            console.log("Error:");
            console.log(data);
            return;
        }

        console.log("Login successful!");
        console.log({
            ...data,
            token: data.token ? "[HIDDEN]" : undefined
        });
    } catch (error) {
        console.error("Request failed:", error.message);
    }
}

testLogin();