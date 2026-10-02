const fs = require("node:fs");
const path = require("node:path");

const raw = process.env.LOOP_API_BASE_URL;
if (!raw) {
  throw new Error("Set LOOP_API_BASE_URL in Netlify to the deployed Render API URL ending in /api");
}

let api;
try {
  api = new URL(raw);
} catch {
  throw new Error("LOOP_API_BASE_URL must be a valid HTTPS URL ending in /api");
}

if (api.protocol !== "https:" || api.pathname.replace(/\/+$/, "") !== "/api") {
  throw new Error("LOOP_API_BASE_URL must use HTTPS and end in /api");
}

const output = `window.LOOP_API_BASE_URL = ${JSON.stringify(api.origin + api.pathname.replace(/\/+$/, ""))};\n`;
fs.writeFileSync(path.join(__dirname, "..", "frontend", "config.js"), output, "utf8");
