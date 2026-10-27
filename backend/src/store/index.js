const { createMemoryStore } = require("./memory");

function createStore() {
  if (process.env.DB_HOST) {
    const { createMysqlStore } = require("./mysql");
    return createMysqlStore({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }
  console.log("DB_HOST not set: using the in-memory store (data is lost on restart).");
  return createMemoryStore();
}

module.exports = { createStore };
