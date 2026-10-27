// Simulates two ambulances moving around Bengaluru. Run the API first, then: npm run simulate
const BASE = process.env.API_URL || "http://localhost:4000";
const HEADERS = { "Content-Type": "application/json", "x-api-key": process.env.API_KEY || "" };

const fleet = [
  { id: "AMB-1", lat: 12.9716, lng: 77.5946, dLat: 0.0004, dLng: 0.0003 },
  { id: "AMB-2", lat: 12.9352, lng: 77.6245, dLat: -0.0003, dLng: 0.0004 },
];

async function tick() {
  for (const a of fleet) {
    a.lat += a.dLat;
    a.lng += a.dLng;
    const res = await fetch(`${BASE}/api/ambulances/${a.id}/location`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ lat: a.lat, lng: a.lng, speed: 40 + Math.round(Math.random() * 20) }),
    });
    if (!res.ok) console.error(a.id, res.status, await res.text());
  }
}

console.log(`Sending locations to ${BASE} every 2 seconds. Press Ctrl+C to stop.`);
tick();
setInterval(tick, 2000);
