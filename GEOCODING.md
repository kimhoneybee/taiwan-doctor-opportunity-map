# Geocoding workflow

The website reads coordinates from `opportunities.json` and does not geocode records in the browser. This avoids repeated external requests and prevents the page from silently accepting the first low-confidence candidate.

## Current dataset status

As of 2026-10-24, the file contains 65 opportunities. All 65 have null coordinates. Fifty records contain a street number and are eligible for an exact-address attempt; 15 have incomplete addresses and are skipped. The existing `approximate` flag is preserved for those records. An incomplete address is never completed or assigned a guessed point by the batch script.

## Run the batch tool

The script uses Esri ArcGIS World Geocoding Service and requires an API key with geocoding privileges. Set the key only in a local environment variable; do not paste it into the HTML, JSON, or Git history.

```sh
ARCGIS_API_KEY='your-key' node scripts/geocode-opportunities.mjs --dry-run
ARCGIS_API_KEY='your-key' node scripts/geocode-opportunities.mjs
```

The tool is safe to rerun: existing coordinates are skipped unless `--overwrite` is supplied, repeated addresses are cached during a run, requests are sent sequentially, and only matches that pass all checks are saved. It requires a score of at least 95, a `PointAddress` or `Subaddress` match, matching county and district text, and the same house number. Other records remain unlocated and are listed in the console summary. Review the generated JSON diff before committing.

## Service limits and stored results

Esri currently documents a 20,000 monthly free tier for geocodes that are not stored, followed by $0.50 per 1,000; stored geocodes are $4 per 1,000 ([current pricing](https://developers.arcgis.com/pricing/credits/)). This tool sends `forStorage=true` because the results are written to the repository; one stored geocode request for each of the 50 eligible records would be about $0.20 at the published rate (the actual billed amount depends on requests/results and account terms). The API requires an ArcGIS account/API key. Review current pricing and account quotas before running. The [address-candidate API](https://developers.arcgis.com/rest/geocode/find-address-candidates/) returns a score and address match type, documented in the [service output fields](https://developers.arcgis.com/rest/geocode/service-output/).

TGOS is an official Taiwan alternative for batch address matching, but requires TGOS membership and approval for an API key. The [government service page](https://www.gov.tw/News_Content_2_371654) lists a daily limit of 10,000 records and an estimated 72-hour processing time. The batch tool does not call TGOS until a provider adapter is implemented and the applicable key and data-use terms are confirmed.

The public [OSM Nominatim endpoint](https://operations.osmfoundation.org/policies/nominatim/) is not used for repeat website requests. Its published policy caps use at one request per second, requires app identification and attribution, discourages periodic app requests, and requires results from one-time bulk jobs to be cached.

## Location quality in the UI

- `locationQuality: "address"` with `approximate: false`: address-level point that passed the batch checks.
- Coordinates with `approximate: true` or without address-level verification: shown as an approximate marker.
- Null coordinates: no map marker; the card states that the location is unverified or the address is incomplete.

Do not assign a map point to an incomplete address unless a separately verified administrative-area centroid is added and explicitly marked approximate.
