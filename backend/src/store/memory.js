// In-memory store: used for local development without MySQL and for tests.
function createMemoryStore() {
  const latest = new Map();
  const history = new Map();

  return {
    async upsertLocation(id, { lat, lng, speed }) {
      const record = { id, lat, lng, speed, updatedAt: new Date().toISOString() };
      latest.set(id, record);
      const list = history.get(id) || [];
      list.push(record);
      if (list.length > 1000) list.shift();
      history.set(id, list);
      return record;
    },
    async list() {
      return [...latest.values()].sort((a, b) => a.id.localeCompare(b.id));
    },
    async history(id, limit) {
      return (history.get(id) || []).slice(-limit).reverse();
    },
  };
}

module.exports = { createMemoryStore };
