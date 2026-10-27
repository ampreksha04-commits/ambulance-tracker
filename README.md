# Live Ambulance Tracker

A full-stack web app that shows the live location of ambulances. It extends my IoT digital twin project (ESP32 + GPS), where a device sends its position to the cloud, by adding a REST API, a database and a React dashboard.

## Tech stack

- **Front end:** React, Vite
- **Back end:** Node.js, Express, REST API
- **Database:** MySQL (parameterized queries), with an in-memory store for local development and tests
- **Testing:** Jest, Supertest
- **CI/CD:** GitHub Actions (tests and build on every push and pull request)

## How it works

```
ESP32 + GPS  --POST location-->  Express REST API  -->  MySQL
                                        ^
                       React dashboard polls every 3 seconds
```

## Run it locally

You need Node.js 18 or newer.

**1. Start the API** (uses the in-memory store, so no database is needed)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**2. Start the dashboard** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

**3. Send some data** (in a third terminal)

```bash
cd backend
API_KEY=change-me npm run simulate
```

Two ambulances start moving on the dashboard.

### Using MySQL instead

```bash
docker compose up -d          # starts MySQL and creates the tables from backend/schema.sql
```

Then uncomment the `DB_*` lines in `backend/.env` and restart the API.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/ambulances` | Latest position of every ambulance |
| POST | `/api/ambulances/:id/location` | Report a position. Body: `{ "lat": 12.97, "lng": 77.59, "speed": 45 }`. Requires the `x-api-key` header when `API_KEY` is set |
| GET | `/api/ambulances/:id/history?limit=50` | Recent positions, newest first (max 200) |

Example:

```bash
curl -X POST http://localhost:4000/api/ambulances/AMB-1/location \
  -H "Content-Type: application/json" -H "x-api-key: change-me" \
  -d '{"lat": 12.9716, "lng": 77.5946, "speed": 50}'
```

## Tests

```bash
cd backend
npm test
```

The tests cover validation (out-of-range and wrong-type values), a malicious ambulance id, API key authentication, history ordering and 404 handling.

## CI/CD

`.github/workflows/ci.yml` runs the backend tests and the frontend build on every push to `main` and on every pull request.

## Design decisions

- **Input validation and parameterized SQL** on every endpoint, so user input never becomes part of a query.
- **API key authentication** for devices that write data.
- **Store interface** (`memory.js` and `mysql.js`), so the API can run and be tested without a database.
- **Two tables:** `ambulances` holds the latest state for fast reads, and `locations` keeps the history.

## Deploying to AWS (outline)

1. Create an RDS MySQL instance and run `backend/schema.sql` on it.
2. Run the API on EC2 (or Elastic Beanstalk) with the `DB_*`, `API_KEY` and `PORT` environment variables set.
3. Build the dashboard with `VITE_API_URL` set to the API address, then host `frontend/dist` on S3 with CloudFront.
