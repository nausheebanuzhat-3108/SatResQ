# SatResQ Pro — AstraVex

A redesigned local demonstration of offline-first roadside reporting.

## Windows quick start

1. Keep your existing project as a backup. Extract this ZIP into a NEW folder.
2. Stop the old preview server using port 4173 (Ctrl+C in its terminal).
3. Open the extracted SatResQ-Pro folder in VS Code.
4. Use Node.js 22.12 or later (an even-numbered supported release).
5. Run `npm ci`, then `npm run demo`.
6. Open http://localhost:4173. The responder view is http://localhost:4173/#dispatch.

Or double-click START-SATRESQ.cmd. Initial dependency installation requires internet access. Only ONE server is needed: it serves both the production interface and the API on port 4173. Stop it with Ctrl+C. Later runs can use `npm start` without rebuilding, unless code changed.

### If the old interface appears

Keep browser Offline unchecked. Open Ctrl+Shift+I > Application > Service workers. Click skipWaiting for the waiting worker, then refresh. If it still shows the old project, unregister only localhost:4173, close all its tabs and reopen. Do not clear localStorage if you want to import the earlier report.

## What's implemented

- Responsive overview, request queue, responder workspace and transport lab.
- Rule-based safety priority: immediate danger overrides problem category; unknown answers trigger urgent review.
- Browser geolocation with accuracy/timestamp, and manual landmark fallback.
- Up to 50 locally saved reports. Requests are immutable; create a new report for changed details.
- Explicit delivery authorisation with Queue & send; drafts never auto-send.
- Compact versioned JSON is the ACTUAL HTTP request body.
- Backend packet decoding and validation; priority recomputed on the server.
- Server acknowledgement, ID-based deduplication, conflict rejection for changed payloads under the same ID.
- Opt-out automatic retry while the app is OPEN, with increasing delays capped at 60 seconds. Manual retry and pause controls.
- Backend connection health, offline demo toggle, event timeline and packet size display.
- Responder status progression: Received > Accepted > En route > Resolved. All are DEMONSTRATION operator actions.
- Persistent backend records, status history and status synchronization to the user's queue.
- Search, priority filters and JSON exports.
- PWA caching, application manifest, icons and a visible update prompt.
- Three local satellite simulations: success, unavailable link, lost acknowledgement.
- Import the last earlier-prototype report from the same browser origin. The old key is preserved and never deleted automatically.

## Scope: present it accurately

This is NOT connected to emergency services. No real help is dispatched. There is no trained AI model; triage uses auditable demonstration rules. Notes are retained but not interpreted. Satellite communication is simulated entirely within the browser. Mock receipts NEVER change actual HTTP delivery status. The chosen 1,024-byte satellite demo limit is not a provider specification. Actual HTTP delivery accepts compact packets up to the server's 8 KB request limit. Payload metrics exclude protocol overhead.

Offline loading requires an initial successful production load and available browser cache. Geolocation may fail offline. Local browser storage is best effort, not a guaranteed permanent backup. Export important demo data. Auto retry requires the app to be open; there is no guaranteed background or closed-app delivery. No automatic switching to real satellite hardware exists.

This unauthenticated backend is deliberately bound to localhost for a single-machine demo. Do not expose it publicly or use it for real emergencies. A real deployment requires authentication, authorization, operational review, consent and retention controls, and provider integration. Dashboard operator status is not evidence of actual real-world dispatch.

The built-in Test offline mode button pauses application API activity; it does NOT disconnect the operating system or prove service-worker caching. Use Developer Tools Offline for the actual offline reload test.

## Testing

`npm test` runs meaningful codec/validation/safety/API/persistence tests.

### Manual acceptance flow

1. Create a fictional report (use a test landmark, not a real person's details).
2. Review its priority and byte count. Save alone must NOT create a backend request.
3. Queue & send. Confirm the same ID appears in Responder.
4. Mark Accepted, En route, then Resolved. Verify My requests reflects the new demo status.
5. Create another report. Enable Test offline mode, then Queue & send. It must remain queued.
6. Exit offline demo. With auto retry enabled, receipt should arrive without a manual retry within the next retry window.
7. For actual offline caching: wait for 'Ready for offline reporting', refresh online, then Developer Tools > Application > Service workers > Offline. Refresh normally. Your local queue must survive. Reconnect afterward.
8. Stop/restart `npm start`. Dashboard records must persist.
9. Run all three satellite scenarios. They must not add dashboard records or change HTTP receipt status.
10. Inspect browser Network > POST /api/requests: keys v/id/t/c/i/d/e/l/m/n prove compact delivery is integrated.

## Demo script (about 3 minutes)

'When a breakdown happens outside coverage, collecting the right details should not depend on a connection. SatResQ prepares a structured assistance report locally.'

Show a fictional breakdown and safety answers. 'Our prototype uses rules to suggest the assistance category and prioritise uncertainty or immediate danger. It is not a mechanical diagnosis.'

Queue a second report offline, refresh, reconnect. 'The report stays on this device. Delivery is only confirmed after the backend acknowledges it. Authorised queued requests retry while the app is open, and the same ID prevents duplicate records.'

Show responder status. 'This is a demonstration operator workflow, not a real dispatch integration.'

Show compact packet and simulation. 'The actual HTTP path uses this compact versioned payload. Separately, these satellite scenarios model success, unavailable links and lost acknowledgements. No satellite radio is being used.'

## Files and architecture

- `src/App.jsx`: UI, queue delivery, polling, local simulation and form.
- `src/store.js`: local queue operations and JSON export.
- `shared/core.js`: shared validation, compact encoder/decoder and priority rules.
- `server.mjs`: local Express API, persistence and static production serving.
- `vite.config.js`: build, PWA precache and API network-only behavior.
- `tests/core.test.mjs`: automated core/API tests.
- `server-data/requests.json`: created when a report is received; excluded from the release.

Wire schema version 1: v=version, id=UUID, t=timestamp in milliseconds, c=vehicle index, i=issue index, d/e=safety-answer indexes, l=null or [latitude, longitude, accuracy, capture timestamp], m=landmark, n=notes. Text and coordinates are preserved. Versioning makes codebook changes explicit. Both sides share the same codebook.

## Development

Run `npm start` for backend on 4173. In another terminal run `npm run dev` for the Vite UI on 5173, which proxies /api to 4173. Offline service workers are disabled in development. Use `npm run build` then restart production to validate offline behavior. Development and production browser storage differ by port.

## Current limits

A compact local prototype, not a production emergency system. No accounts, payments, live map tiles, BLE mesh, real satellite service, ML symptom model, real responder network, multi-user roles, or background closed-app sync. Browser storage holds 50 reports and only 40 recent local events per report. Backend uses a single-process JSON file; multiple server processes must not share its data directory. Use one active delivery tab when Web Locks is unavailable; backend deduplication remains the final protection.

### References used during implementation

- https://vite-pwa-org.netlify.app/guide/prompt-for-update
- https://vite-pwa-org.netlify.app/frameworks/react
- https://expressjs.com/en/starter/static-files/
