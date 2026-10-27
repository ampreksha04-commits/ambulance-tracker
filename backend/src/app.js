const express = require("express");
const cors = require("cors");

const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const inRange = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;

function createApp(store, { apiKey } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10kb" }));

  // Simple device authentication: required only when an API key is configured.
  const requireKey = (req, res, next) => {
    if (apiKey && req.get("x-api-key") !== apiKey) {
      return res.status(401).json({ error: "Invalid or missing API key" });
    }
    next();
  };
   app.get("/", (req, res) =>
     res.json({
       name: "Ambulance Tracker API",
       status: "running",
       dashboard: "http://localhost:5173",
       endpoints: ["GET /api/health", "GET /api/ambulances", "POST /api/ambulances/:id/location", "GET /api/ambulances/:id/history"],
     })
   );

  app.get("/api/ambulances", async (req, res, next) => {
    try {
      res.json(await store.list());
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/ambulances/:id/location", requireKey, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { lat, lng, speed = 0 } = req.body || {};
      if (!ID_RE.test(id)) return res.status(400).json({ error: "Invalid ambulance id" });
      if (!inRange(lat, -90, 90)) return res.status(400).json({ error: "lat must be a number between -90 and 90" });
      if (!inRange(lng, -180, 180)) return res.status(400).json({ error: "lng must be a number between -180 and 180" });
      if (!inRange(speed, 0, 300)) return res.status(400).json({ error: "speed must be a number between 0 and 300" });
      res.status(201).json(await store.upsertLocation(id, { lat, lng, speed }));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/ambulances/:id/history", async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!ID_RE.test(id)) return res.status(400).json({ error: "Invalid ambulance id" });
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      res.json(await store.history(id, limit));
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
