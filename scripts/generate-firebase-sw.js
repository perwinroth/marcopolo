const fs = require("fs");
const path = require("path");

function loadEnvFile(filename) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const requiredEnv = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required env var: ${key}`);
    }
}

const templatePath = path.join(process.cwd(), "public", "firebase-messaging-sw.template.js");
const outputPath = path.join(process.cwd(), "public", "firebase-messaging-sw.js");

let content = fs.readFileSync(templatePath, "utf8");

content = content
    .replace("__FIREBASE_API_KEY__", process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
    .replace("__FIREBASE_AUTH_DOMAIN__", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
    .replace("__FIREBASE_PROJECT_ID__", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    .replace("__FIREBASE_STORAGE_BUCKET__", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    .replace("__FIREBASE_MESSAGING_SENDER_ID__", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
    .replace("__FIREBASE_APP_ID__", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

fs.writeFileSync(outputPath, content);
console.log(`Generated ${outputPath}`);
