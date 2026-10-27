const request = require("supertest");
const { createApp } = require("../src/app");
const { createMemoryStore } = require("../src/store/memory");

const makeApp = (opts) => createApp(createMemoryStore(), opts);
const post = (app, id, body, headers = {}) =>
  request(app).post(`/api/ambulances/${id}/location`).set(headers).send(body);

describe("ambulance API", () => {
  test("health check returns ok", async () => {
    const res = await request(makeApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("stores a location and lists it", async () => {
    const app = makeApp();
    const created = await post(app, "AMB-1", { lat: 12.97, lng: 77.59, speed: 45 });
    expect(created.status).toBe(201);
    const list = await request(app).get("/api/ambulances");
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: "AMB-1", lat: 12.97, lng: 77.59, speed: 45 });
  });

  test("rejects out-of-range latitude", async () => {
    const res = await post(makeApp(), "AMB-1", { lat: 95, lng: 77.59 });
    expect(res.status).toBe(400);
  });

  test("rejects coordinates sent as strings", async () => {
    const res = await post(makeApp(), "AMB-1", { lat: "12.97", lng: "77.59" });
    expect(res.status).toBe(400);
  });

  test("rejects a malicious ambulance id", async () => {
    const res = await post(makeApp(), "x'%20OR%201=1--", { lat: 12.9, lng: 77.5 });
    expect(res.status).toBe(400);
  });

  test("requires the API key when one is configured", async () => {
    const app = makeApp({ apiKey: "secret" });
    const body = { lat: 12.9, lng: 77.5 };
    expect((await post(app, "AMB-1", body)).status).toBe(401);
    expect((await post(app, "AMB-1", body, { "x-api-key": "wrong" })).status).toBe(401);
    expect((await post(app, "AMB-1", body, { "x-api-key": "secret" })).status).toBe(201);
  });

  test("history is newest first and respects the limit", async () => {
    const app = makeApp();
    for (const lat of [10, 11, 12]) await post(app, "AMB-1", { lat, lng: 77 });
    const res = await request(app).get("/api/ambulances/AMB-1/history?limit=2");
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.lat)).toEqual([12, 11]);
  });

  test("unknown routes return 404", async () => {
    const res = await request(makeApp()).get("/api/nope");
    expect(res.status).toBe(404);
  });
});
