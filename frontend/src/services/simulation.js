const ROUTES = [
  {
    id: "AMB-01",
    points: [[12.9716, 77.5946], [12.9731, 77.5965], [12.9748, 77.5981], [12.9762, 77.5972], [12.977, 77.5951], [12.9757, 77.5932]],
    start: 2,
    speed: 42,
  },
  {
    id: "AMB-02",
    points: [[12.9638, 77.5845], [12.9651, 77.5863], [12.9668, 77.5874], [12.9686, 77.5862], [12.9691, 77.5839], [12.9674, 77.5826]],
    start: 4,
    speed: 31,
  },
  {
    id: "AMB-03",
    points: [[12.984, 77.6033], [12.9855, 77.6051], [12.9872, 77.6058], [12.9882, 77.6036], [12.9873, 77.6016], [12.9852, 77.6012]],
    start: 1,
    speed: 56,
  },
  {
    id: "AMB-04",
    points: [[12.9549, 77.5994], [12.9564, 77.6011], [12.9583, 77.6018], [12.9595, 77.6001], [12.9581, 77.598], [12.956, 77.5977]],
    start: 3,
    speed: 24,
  },
];

function historyEntry(id, position, speed, updatedAt) {
  return { id, lat: position[0], lng: position[1], speed, updatedAt };
}

export function createDemoFleet(now = Date.now()) {
  return ROUTES.map((route) => {
    const position = route.points[route.start];
    const history = Array.from({ length: 5 }, (_, index) => {
      const point = route.points[(route.start - index + route.points.length) % route.points.length];
      return historyEntry(route.id, point, Math.max(12, route.speed + ((index % 3) - 1) * 3), new Date(now - index * 3000).toISOString());
    });
    return {
      id: route.id,
      lat: position[0],
      lng: position[1],
      speed: route.speed,
      updatedAt: new Date(now).toISOString(),
      updateCount: history.length,
      history,
      routeIndex: route.start,
    };
  });
}

export function simulateFleetStep(fleet, speedMultiplier = 1, now = Date.now()) {
  return fleet.map((ambulance) => {
    const route = ROUTES.find((item) => item.id === ambulance.id);
    if (!route) return ambulance;
    const nextIndex = (ambulance.routeIndex + 1) % route.points.length;
    const destination = route.points[nextIndex];
    const lat = ambulance.lat + (destination[0] - ambulance.lat) * Math.min(0.35, 0.18 * speedMultiplier);
    const lng = ambulance.lng + (destination[1] - ambulance.lng) * Math.min(0.35, 0.18 * speedMultiplier);
    const speed = Math.max(8, Math.min(75, route.speed + Math.round(Math.sin(now / 17000 + route.start) * 7)));
    const entry = historyEntry(ambulance.id, [lat, lng], speed, new Date(now).toISOString());
    return {
      ...ambulance,
      lat,
      lng,
      speed,
      updatedAt: entry.updatedAt,
      updateCount: (ambulance.updateCount || 0) + 1,
      routeIndex: nextIndex,
      history: [entry, ...ambulance.history].slice(0, 100),
    };
  });
}
