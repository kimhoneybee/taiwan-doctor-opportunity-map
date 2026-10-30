#!/usr/bin/env node
/**
 * One-time/repeatable geocoding for opportunities.json.
 *
 * Uses Esri ArcGIS World Geocoding Service with forStorage=true because
 * successful coordinates are persisted in the repository JSON.
 * Requires ARCGIS_API_KEY in the environment; never put the key in source.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = path.join(ROOT, "opportunities.json");
const ENDPOINT = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
const MIN_SCORE = 95;
const WAIT_MS = 250;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/台/g, "臺").replace(/[\s,，]/g, "").toLowerCase();
}

function hasFullAddress(item) {
  return /[0-9]+(?:之[0-9]+)?號/.test(normalize(item.address)) &&
    Boolean(item.county) && Boolean(item.district) &&
    !/待確認|待核|未公開|周邊|附近|多據點/.test(item.address || "");
}

function houseNumber(address) {
  return normalize(address).match(/([0-9]+(?:之[0-9]+)?)號/)?.[1] || null;
}

function eligibleCandidate(item, candidate) {
  const a = candidate.attributes || {};
  const score = Number(a.Score);
  const type = String(a.Addr_type || "");
  const label = normalize([a.Match_addr, a.LongLabel, a.StAddr, a.AddNum, a.City, a.Subregion, a.Region].join(" "));
  const number = houseNumber(item.address);
  const areaParts = [item.county, item.district].filter(Boolean).map(normalize);
  return Number.isFinite(candidate.location?.x) &&
    Number.isFinite(candidate.location?.y) &&
    score >= MIN_SCORE &&
    ["PointAddress", "Subaddress"].includes(type) &&
    Boolean(number && (normalize(a.AddNum) === number || label.includes(number + "號"))) &&
    areaParts.every(part => label.includes(part));
}

async function geocode(item, token) {
  const body = new URLSearchParams({
    f: "json",
    singleLine: item.address,
    countryCode: "TWN",
    langCode: "ZHT",
    maxLocations: "5",
    outSR: "4326",
    outFields: "Addr_type,Match_addr,LongLabel,StAddr,AddNum,City,Subregion,Region,Score",
    forStorage: "true",
    token
  });
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`ArcGIS error ${payload.error.code}: ${payload.error.message}`);
  return (payload.candidates || []).find(candidate => eligibleCandidate(item, candidate)) || null;
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const raw = await fs.readFile(DATA_PATH, "utf8");
const data = JSON.parse(raw);
const opportunities = Array.isArray(data) ? data : data.opportunities;
if (!Array.isArray(opportunities)) throw new Error("Expected an opportunities array in opportunities.json.");

const needs = opportunities.filter(item => hasFullAddress(item) && (!Number.isFinite(item.lat) || !Number.isFinite(item.lng) || overwrite));
const incomplete = opportunities.filter(item => !hasFullAddress(item));
const alreadyMapped = opportunities.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
console.log(JSON.stringify({
  total: opportunities.length,
  alreadyMapped: alreadyMapped.length,
  eligibleForExactGeocoding: needs.length,
  incompleteAddressSkipped: incomplete.length,
  mode: dryRun ? "dry-run" : "write"
}, null, 2));

if (dryRun) process.exit(0);
const token = process.env.ARCGIS_API_KEY;
if (!token) {
  console.error("Missing ARCGIS_API_KEY. Set it in your shell; do not commit it or add it to the HTML.");
  process.exit(2);
}

let matched = 0;
let unresolved = 0;
const cache = new Map();
for (const item of needs) {
  const key = normalize(item.address);
  let candidate = cache.get(key);
  if (candidate === undefined) {
    try {
      candidate = await geocode(item, token);
    } catch (error) {
      console.error(`Geocoding failed for ${item.id}: ${error.message}; stopping the batch to avoid repeated failed requests.`);
      break;
    }
    cache.set(key, candidate);
    await pause(WAIT_MS);
  }
  if (!candidate) {
    item.locationQuality = "unresolved";
    unresolved++;
    continue;
  }
  const a = candidate.attributes || {};
  item.lat = Number(candidate.location.y);
  item.lng = Number(candidate.location.x);
  item.approximate = false;
  item.locationQuality = "address";
  item.geocode = {
    provider: "Esri ArcGIS World Geocoding Service",
    score: Number(a.Score),
    matchType: a.Addr_type,
    matchedAddress: a.Match_addr || a.LongLabel || "",
    geocodedAt: new Date().toISOString().slice(0, 10)
  };
  matched++;
}
if (Array.isArray(data)) {
  // legacy array format
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
} else {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}
console.log(JSON.stringify({ matched, unresolved, skippedIncomplete: incomplete.length }, null, 2));
