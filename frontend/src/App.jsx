import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";
const POLL_MS = 3000;
const STALE_MS = 15000;

function Plot({ items, now }) {
  const W = 480, H = 320, PAD = 36;
  if (!items.length) {
    return <div className="empty">No ambulances reporting yet. Start the simulator or send a location to the API.</div>;
  }
  const lats = items.map((i) => i.lat);
  const lngs = items.map((i) => i.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const x = (v) => (maxLng === minLng ? W / 2 : PAD + ((v - minLng) / (maxLng - minLng)) * (W - 2 * PAD));
  const y = (v) => (maxLat === minLat ? H / 2 : H - PAD - ((v - minLat) / (maxLat - minLat)) * (H - 2 * PAD));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Relative positions of ambulances" className="plot">
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} className="plot-frame" />
      {items.map((a) => {
        const stale = now - new Date(a.updatedAt).getTime() > STALE_MS;
        return (
          <g key={a.id} transform={`translate(${x(a.lng)} ${y(a.lat)})`} className={stale ? "marker stale" : "marker live"}>
            {!stale && <circle r="14" className="pulse" />}
            <circle r="6" className="dot" />
            <text x="12" y="-10" className="tag">{a.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/ambulances`);
        if (!res.ok) throw new Error(`The API answered with status ${res.status}`);
        const data = await res.json();
        if (active) {
          setItems(data);
          setError(null);
          setNow(Date.now());
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const liveCount = items.filter((a) => now - new Date(a.updatedAt).getTime() <= STALE_MS).length;

  return (
    <main className="shell">
      <header className="top">
        <h1>Ambulance Tracker</h1>
        <p className="summary">
          {liveCount} of {items.length} reporting live
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          Can't reach the API: {error}. Check that the backend is running on port 4000.
        </p>
      )}

      <section className="grid">
        <Plot items={items} now={now} />
        <table className="fleet">
          <caption>Latest reports</caption>
          <thead>
            <tr>
              <th scope="col">Ambulance</th>
              <th scope="col">Latitude</th>
              <th scope="col">Longitude</th>
              <th scope="col">Speed (km/h)</th>
              <th scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const ageS = Math.max(0, Math.round((now - new Date(a.updatedAt).getTime()) / 1000));
              return (
                <tr key={a.id} className={ageS * 1000 > STALE_MS ? "row-stale" : ""}>
                  <th scope="row">{a.id}</th>
                  <td>{a.lat.toFixed(5)}</td>
                  <td>{a.lng.toFixed(5)}</td>
                  <td>{a.speed}</td>
                  <td>{ageS < 2 ? "just now" : `${ageS}s ago`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
