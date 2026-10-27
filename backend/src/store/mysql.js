const mysql = require("mysql2/promise");

// MySQL store. All queries are parameterized (no string building) to prevent SQL injection.
function createMysqlStore(config) {
  const pool = mysql.createPool({ ...config, connectionLimit: 10 });

  const toRecord = (row) => ({
    id: row.ambulance_id ?? row.id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    speed: Number(row.speed),
    updatedAt: new Date(row.updated_at ?? row.recorded_at).toISOString(),
  });

  return {
    async upsertLocation(id, { lat, lng, speed }) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          `INSERT INTO ambulances (id, lat, lng, speed) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE lat = VALUES(lat), lng = VALUES(lng), speed = VALUES(speed), updated_at = CURRENT_TIMESTAMP`,
          [id, lat, lng, speed]
        );
        await conn.execute(
          "INSERT INTO locations (ambulance_id, lat, lng, speed) VALUES (?, ?, ?, ?)",
          [id, lat, lng, speed]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
      return { id, lat, lng, speed, updatedAt: new Date().toISOString() };
    },
    async list() {
      const [rows] = await pool.execute("SELECT id, lat, lng, speed, updated_at FROM ambulances ORDER BY id");
      return rows.map(toRecord);
    },
    async history(id, limit) {
      const [rows] = await pool.query(
        "SELECT ambulance_id, lat, lng, speed, recorded_at FROM locations WHERE ambulance_id = ? ORDER BY recorded_at DESC, id DESC LIMIT ?",
        [id, limit]
      );
      return rows.map(toRecord);
    },
  };
}

module.exports = { createMysqlStore };
