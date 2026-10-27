# Live Ambulance Tracking System

A responsive emergency fleet operations dashboard built with React and Vite. It provides an interactive Bengaluru map, simulated ambulance telemetry, fleet status monitoring, location history, analytics, and browser-persisted demo settings.

## Features

- Interactive OpenStreetMap with simulated moving ambulance markers, vehicle popups, fit-fleet and Bengaluru controls.
- Fleet overview metrics, searchable and filterable vehicle table, speed sorting, and a vehicle details panel.
- Separate Overview, Live Map, Ambulance Fleet, Location History, Analytics, and Settings views.
- Pause/resume simulation, configurable polling and stale thresholds, and simulation speed controls.
- API connection warning and a local simulation fallback when the backend cannot be reached.
- Responsive layout for desktop, tablet, and mobile.

All locations are generated demo data around Bengaluru. The dashboard does not connect to real GPS devices.

## Technology

- React 18, Vite, and JavaScript
- React Leaflet, Leaflet, and OpenStreetMap tiles
- Lucide React icons and Recharts
- Existing Node.js/Express API and MySQL-ready store in `backend/`

## Screenshots

Add project screenshots here, for example `docs/screenshots/overview.png` and `docs/screenshots/analytics.png`.

## Install and run

Use Node.js 18 or newer.

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

To run the optional API in a second terminal:

```powershell
cd backend
npm install
npm run dev
```

The Vite development server forwards `/api` requests to `http://localhost:4000`. The dashboard continues using simulated fleet data if the API is unavailable. To point it to another API, create `frontend/.env.local` with:

```env
VITE_API_BASE_URL=http://localhost:4000
```

Do not put API keys or passwords in frontend environment variables.

## Simulation mode

The simulation starts automatically with four distinct vehicles moving gradually along short generated paths in Bengaluru. It refreshes every three seconds by default, keeps an in-memory update history, and marks a vehicle stale when its last update exceeds the configured threshold. Use the sidebar connection control or the Live Map/Fleet page control to pause or resume movement. Settings can be changed from the Settings page and are saved in local storage.

## Architecture

- `frontend/src/services/simulation.js` owns the simulated fleet routes and in-memory update records.
- `frontend/src/services/api.js` contains reusable health, list, detail, and location-write requests. It supports the existing backend routes and the planned generic API routes.
- `frontend/src/App.jsx` owns shared fleet state and composes the navigable dashboard views and reusable UI components.
- `backend/src/app.js` exposes the current Express API; `backend/src/store/` separates in-memory and MySQL persistence.

## API readiness

The client supports `GET /api/health`, `GET /api/ambulances`, `GET /api/ambulances/:id`, and `POST /api/locations`. For compatibility with this repository's current server, detail and location writes can fall back to `/api/ambulances/:id/history` and `/api/ambulances/:id/location` respectively. The dashboard currently polls the list/health endpoints; simulated data remains the default unless an API base URL is configured.

## Future integrations

Connect the existing Node.js API to MySQL, then replace the demo location source with authenticated ESP32 GPS reports. AWS deployment can use a managed MySQL database, an API service, and static hosting/CDN for the Vite build. These integrations are not enabled by this demo dashboard.

## Tests and build

```powershell
cd backend
npm test
cd ..\frontend
npm run build
```
