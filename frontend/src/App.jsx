import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Activity, Ambulance, ArrowDownUp, Bell, Check, ChevronDown, ChevronLeft, Clock3,
  Crosshair, Filter, Gauge, History, LayoutDashboard, MapPinned, Menu, Navigation,
  Pause, Play, Radio, RefreshCw, Search, Settings as SettingsIcon, ShieldCheck,
  SlidersHorizontal, Signal, Siren, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "leaflet/dist/leaflet.css";
import { getAmbulances, getHealth } from "./services/api.js";
import { createDemoFleet, simulateFleetStep } from "./services/simulation.js";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "map", label: "Live map", icon: MapPinned },
  { id: "fleet", label: "Ambulance fleet", icon: Ambulance },
  { id: "history", label: "Location history", icon: History },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];
const BENGALURU = [12.9716, 77.5946];
const formatTime = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const formatCoordinate = (value) => Number(value).toFixed(5);

function statusOf(ambulance, now, staleThreshold) {
  return now - new Date(ambulance.updatedAt).getTime() > staleThreshold ? "stale" : "active";
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}><span />{status === "stale" ? "Stale" : "Active"}</span>;
}

function StatCard({ icon: Icon, label, value, note, tone, trend }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} strokeWidth={2} /></div>
      <div className="stat-copy"><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-note">{note}</span></div>
      {trend && <span className={`stat-trend ${tone}`}>{trend}</span>}
    </article>
  );
}

function MapController({ focus, bounds, overview }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 16, { duration: 0.75 });
  }, [focus, map]);
  useEffect(() => {
    if (bounds?.length) map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 14, duration: 0.75 });
  }, [bounds, map]);
  useEffect(() => {
    if (overview) map.flyTo(BENGALURU, 12, { duration: 0.75 });
  }, [overview, map]);
  return null;
}

function createAmbulanceIcon(status) {
  return L.divIcon({
    className: "ambulance-marker-shell",
    html: `<div class="ambulance-marker ${status}"><span class="marker-pulse"></span><span class="marker-vehicle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5h11.3a2 2 0 0 1 1.7.95L19 12h1.2a1.8 1.8 0 0 1 1.8 1.8v2.7h-1.6a2.4 2.4 0 0 1-4.8 0h-6a2.4 2.4 0 0 1-4.8 0H3z"/><path d="M14 9.5v3h3.2l-1.8-2.7a.7.7 0 0 0-.6-.3zM8.9 8.6v3.1m-1.55-1.55h3.1"/></svg></span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
  });
}

function LiveMap({ ambulances, now, staleThreshold, onSelect, focus, bounds, overview, onFocusAll, onOverview, onRefresh }) {
  const active = ambulances.filter((item) => statusOf(item, now, staleThreshold) === "active");
  const stale = ambulances.filter((item) => statusOf(item, now, staleThreshold) === "stale");
  return (
    <section className="map-card">
      <div className="map-heading">
        <div><div className="section-title-row"><h2>Live fleet map</h2><span className="simulation-tag"><span />Simulation mode</span></div><p>Ambulance positions across Bengaluru</p></div>
        <div className="map-actions">
          <button className="icon-button" onClick={onRefresh} aria-label="Refresh map" title="Refresh map"><RefreshCw size={16} /></button>
          <button className="map-action" onClick={onFocusAll}><Crosshair size={15} />Fit fleet</button>
          <button className="map-action" onClick={onOverview}><MapPinned size={15} />Bengaluru</button>
        </div>
      </div>
      <div className="map-frame">
        <MapContainer center={BENGALURU} zoom={12} scrollWheelZoom className="leaflet-map" zoomControl>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController focus={focus} bounds={bounds} overview={overview} />
          {ambulances.map((ambulance) => {
            const status = statusOf(ambulance, now, staleThreshold);
            return <Marker key={ambulance.id} position={[ambulance.lat, ambulance.lng]} icon={createAmbulanceIcon(status)} eventHandlers={{ click: () => onSelect(ambulance.id) }}>
              <Popup><div className="map-popup"><strong>{ambulance.id}</strong><StatusBadge status={status} /><span>Speed <b>{ambulance.speed} km/h</b></span><span>Latitude <b>{formatCoordinate(ambulance.lat)}</b></span><span>Longitude <b>{formatCoordinate(ambulance.lng)}</b></span><span>Updated <b>{formatTime(ambulance.updatedAt)}</b></span></div></Popup>
            </Marker>;
          })}
        </MapContainer>
        <div className="map-legend"><span><i className="legend-dot active" />Active <b>{active.length}</b></span><span><i className="legend-dot stale" />Stale <b>{stale.length}</b></span></div>
        <div className="map-sim-stamp"><Radio size={13} /> SIMULATED GPS</div>
      </div>
      <div className="map-footer"><span><span className="live-dot" />Position stream updating every 3 seconds</span><span>Map data © OpenStreetMap</span></div>
    </section>
  );
}

function AmbulanceTable({ ambulances, now, staleThreshold, query, setQuery, filter, setFilter, sort, setSort, onSelect, onFocus }) {
  const rows = [...ambulances].filter((item) => item.id.toLowerCase().includes(query.toLowerCase()))
    .filter((item) => filter === "all" || statusOf(item, now, staleThreshold) === filter)
    .sort((a, b) => sort === "speed" ? b.speed - a.speed : a.id.localeCompare(b.id));
  return (
    <section className="panel fleet-panel">
      <div className="panel-heading fleet-heading"><div><div className="section-title-row"><h2>Ambulance fleet</h2><span className="count-pill">{rows.length} units</span></div><p>Latest simulated telemetry from each vehicle</p></div>
        <div className="table-tools"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fleet" aria-label="Search ambulance ID" /></label><label className="filter-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by status"><option value="all">All status</option><option value="active">Active</option><option value="stale">Stale</option></select></label><button className={`sort-button ${sort === "speed" ? "selected" : ""}`} onClick={() => setSort(sort === "speed" ? "id" : "speed")}><ArrowDownUp size={14} />Speed</button></div>
      </div>
      <div className="table-wrap"><table className="fleet-table"><thead><tr><th>Ambulance ID</th><th>Status</th><th>Speed</th><th>Latitude</th><th>Longitude</th><th>Last update</th><th aria-label="Actions" /></tr></thead>
        <tbody>{rows.map((item) => <tr key={item.id} onClick={() => onFocus(item)} className="clickable-row"><td><span className="unit-id"><span className="unit-symbol"><Ambulance size={15} /></span><strong>{item.id}</strong></span></td><td><StatusBadge status={statusOf(item, now, staleThreshold)} /></td><td className="numeric-cell">{item.speed}<small> km/h</small></td><td className="numeric-cell">{formatCoordinate(item.lat)}</td><td className="numeric-cell">{formatCoordinate(item.lng)}</td><td className="updated-cell">{formatTime(item.updatedAt)}</td><td><button className="row-action" aria-label={`View ${item.id} details`} title="View details" onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}><ChevronLeft size={17} /></button></td></tr>)}</tbody>
      </table>{rows.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><strong>No ambulances found</strong><span>Try changing your search or status filter.</span></div>}</div>
      <div className="table-foot"><span>Showing {rows.length} of {ambulances.length} vehicles</span><span><span className="tiny-live" />Live simulated data</span></div>
    </section>
  );
}

function DetailsPanel({ ambulance, history, now, staleThreshold, onClose, onFocus }) {
  if (!ambulance) return null;
  const recent = history.filter((entry) => entry.id === ambulance.id).slice(0, 5);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="details-panel" role="dialog" aria-modal="true" aria-labelledby="details-title">
    <div className="details-head"><div><span className="eyebrow">VEHICLE DETAILS</span><button className="close-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div><div className="details-title"><span className="detail-vehicle-icon"><Ambulance size={21} /></span><div><h2 id="details-title">{ambulance.id}</h2><p>Simulated unit telemetry</p></div><StatusBadge status={statusOf(ambulance, now, staleThreshold)} /></div></div>
    <div className="details-body"><div className="detail-primary"><span>Current speed</span><strong>{ambulance.speed}<small> km/h</small></strong><div><Gauge size={15} /> GPS connection {statusOf(ambulance, now, staleThreshold)}</div></div>
      <div className="detail-grid"><div><span>Latitude</span><strong>{formatCoordinate(ambulance.lat)}</strong></div><div><span>Longitude</span><strong>{formatCoordinate(ambulance.lng)}</strong></div><div><span>Last GPS update</span><strong>{formatTime(ambulance.updatedAt)}</strong></div><div><span>Location updates</span><strong>{ambulance.updateCount || 0}</strong></div></div>
      <div className="recent-head"><h3>Recent location history</h3><span>{recent.length} updates</span></div><div className="recent-list">{recent.length ? recent.map((entry, index) => <div className="recent-entry" key={`${entry.updatedAt}-${index}`}><span className="recent-timeline"><i /></span><div><strong>{formatCoordinate(entry.lat)}, {formatCoordinate(entry.lng)}</strong><span>{formatTime(entry.updatedAt)} · {entry.speed} km/h</span></div></div>) : <div className="empty-mini">No location updates recorded.</div>}</div>
      <button className="primary-button full-button" onClick={() => { onFocus(ambulance); onClose(); }}><Crosshair size={16} />Focus on map</button>
    </div>
  </aside></div>;
}

function HistoryPage({ history, ambulances }) {
  const [search, setSearch] = useState("");
  const rows = history.filter((entry) => entry.id.toLowerCase().includes(search.toLowerCase())).slice(0, 100);
  return <section className="panel page-panel"><div className="panel-heading"><div><h2>Location history</h2><p>Recent simulated GPS reports across the fleet</p></div><label className="table-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ambulance ID" aria-label="Search history by ID" /></label></div>
    <div className="table-wrap"><table className="fleet-table"><thead><tr><th>Ambulance ID</th><th>Coordinates</th><th>Speed</th><th>Timestamp</th><th>Current status</th></tr></thead><tbody>{rows.map((entry, index) => { const unit = ambulances.find((item) => item.id === entry.id); return <tr key={`${entry.id}-${entry.updatedAt}-${index}`}><td><span className="unit-id"><span className="unit-symbol"><Ambulance size={15} /></span><strong>{entry.id}</strong></span></td><td className="numeric-cell">{formatCoordinate(entry.lat)}, {formatCoordinate(entry.lng)}</td><td className="numeric-cell">{entry.speed} km/h</td><td className="updated-cell">{new Date(entry.updatedAt).toLocaleString("en-IN")}</td><td>{unit && <StatusBadge status={unit.status || "active"} />}</td></tr>; })}</tbody></table>{rows.length === 0 && <div className="empty-state"><strong>No history available</strong><span>Location updates will appear here as the simulator runs.</span></div>}</div>
    <div className="table-foot"><span>{rows.length} recent reports</span><span>In-memory demo history</span></div>
  </section>;
}

function AnalyticsPage({ ambulances, history, now, staleThreshold }) {
  const activeCount = ambulances.filter((item) => statusOf(item, now, staleThreshold) === "active").length;
  const staleCount = ambulances.length - activeCount;
  const speedData = ambulances.map((item) => ({ name: item.id, speed: item.speed }));
  const activityData = useMemo(() => Array.from({ length: 8 }, (_, index) => {
    const time = new Date(now - (7 - index) * 3000);
    const label = time.toLocaleTimeString("en-IN", { minute: "2-digit", second: "2-digit" });
    return { time: label, updates: history.filter((entry) => now - new Date(entry.updatedAt).getTime() < (8 - index) * 3000 && now - new Date(entry.updatedAt).getTime() >= (7 - index) * 3000).length };
  }), [history, now]);
  const statusData = [{ name: "Active", value: activeCount, fill: "#17856b" }, { name: "Stale", value: staleCount, fill: "#d8912c" }];
  return <div className="analytics-page"><div className="analytics-intro"><div><span className="eyebrow">FLEET PERFORMANCE</span><h2>Analytics</h2><p>Operational snapshot generated from the current simulated fleet.</p></div><span className="simulation-tag"><span />Simulation data</span></div>
    <div className="analytics-kpis"><div className="mini-kpi"><span>Average speed</span><strong>{ambulances.length ? Math.round(ambulances.reduce((sum, item) => sum + item.speed, 0) / ambulances.length) : 0}<small> km/h</small></strong></div><div className="mini-kpi"><span>Active units</span><strong>{activeCount}<small> / {ambulances.length}</small></strong></div><div className="mini-kpi"><span>Reports captured</span><strong>{history.length}</strong></div></div>
    <div className="analytics-grid"><section className="panel chart-panel"><div className="chart-heading"><div><h3>Current vehicle speed</h3><p>Speed by ambulance · km/h</p></div><span className="chart-mark blue"><Gauge size={16} /></span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={speedData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#71808e", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#71808e", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f3f6f7" }} /><Bar dataKey="speed" name="Speed (km/h)" fill="#3268df" radius={[4, 4, 0, 0]} barSize={30} /></BarChart></ResponsiveContainer></div></section>
      <section className="panel chart-panel"><div className="chart-heading"><div><h3>Fleet connection status</h3><p>Current reporting availability</p></div><span className="chart-mark green"><Signal size={16} /></span></div><div className="status-chart"><ResponsiveContainer width="58%" height="100%"><PieChart><Pie data={statusData} dataKey="value" innerRadius={55} outerRadius={76} paddingAngle={4} stroke="none">{statusData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="chart-legend">{statusData.map((item) => <div key={item.name}><i style={{ background: item.fill }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></div></section>
      <section className="panel chart-panel wide-chart"><div className="chart-heading"><div><h3>Location update activity</h3><p>Reports recorded in recent 3-second windows</p></div><span className="chart-mark coral"><Activity size={16} /></span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={activityData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf0" /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#71808e", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#71808e", fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="updates" name="Reports" stroke="#e05a48" strokeWidth={2.5} dot={{ r: 3, fill: "#e05a48", strokeWidth: 0 }} /></LineChart></ResponsiveContainer></div></section></div>
  </div>;
}

function SettingsPage({ settings, setSettings, saveSettings, saved }) {
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  return <section className="settings-layout"><div className="settings-intro"><span className="settings-icon"><SlidersHorizontal size={20} /></span><div><h2>Settings</h2><p>Configure how the dashboard receives and displays fleet data.</p></div></div>
    <div className="panel settings-panel"><div className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon"><Clock3 size={17} /></span><div><h3>Update behavior</h3><p>Control the refresh and connection thresholds.</p></div></div><label className="setting-row"><span><strong>Polling interval</strong><small>How often fleet data refreshes</small></span><span className="setting-input"><input type="number" min="1" max="60" value={settings.pollSeconds} onChange={(event) => update("pollSeconds", Math.max(1, Number(event.target.value)))} /><small>seconds</small></span></label><label className="setting-row"><span><strong>Stale threshold</strong><small>Mark a unit stale when no GPS update arrives</small></span><span className="setting-input"><input type="number" min="5" max="300" value={settings.staleSeconds} onChange={(event) => update("staleSeconds", Math.max(5, Number(event.target.value)))} /><small>seconds</small></span></label><label className="setting-row"><span><strong>Simulation speed</strong><small>Movement multiplier for the demo fleet</small></span><span className="setting-input"><select value={settings.simulationSpeed} onChange={(event) => update("simulationSpeed", Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></span></label></div>
      <div className="settings-section"><div className="settings-section-heading"><span className="settings-section-icon"><Radio size={17} /></span><div><h3>Data source</h3><p>The demo works without a running backend.</p></div></div><div className="setting-row mode-row"><span><strong>Simulation mode</strong><small>Generated Bengaluru coordinates, not real GPS</small></span><span className="mode-indicator"><span />Enabled</span></div><label className="api-field"><span>Backend API URL</span><input value={settings.apiUrl} onChange={(event) => update("apiUrl", event.target.value)} placeholder="http://localhost:4000" /><small>Optional. When set, the dashboard attempts the API and falls back to simulation if unavailable.</small></label></div>
      <div className="settings-footer"><span>{saved ? <><Check size={15} /> Settings saved locally</> : "Settings are stored in this browser only."}</span><button className="primary-button" onClick={saveSettings}><Check size={15} />Save settings</button></div>
    </div><div className="settings-note"><ShieldCheck size={16} /><span>No API keys or passwords are stored in local storage.</span></div>
  </section>;
}

function NotificationPanel({ ambulances, now, staleThreshold, onClose, onSelect }) {
  const stale = ambulances.filter((item) => statusOf(item, now, staleThreshold) === "stale");
  return <div className="notification-popover"><div className="notification-heading"><strong>Notifications</strong><button className="bare-button" onClick={onClose} aria-label="Close notifications"><X size={16} /></button></div>{stale.length ? stale.map((item) => <button className="notification-item" key={item.id} onClick={() => onSelect(item.id)}><span className="notification-alert"><Signal size={15} /></span><span><strong>{item.id} connection is stale</strong><small>Last GPS update {formatTime(item.updatedAt)}</small></span></button>) : <div className="notification-clear"><span><Check size={16} /></span><strong>All systems nominal</strong><small>No stale connections detected.</small></div>}<div className="notification-foot">SIMULATION MODE · Live demo feed</div></div>;
}

function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, paused, onToggleSimulation, onMapFocus }) {
  return <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}><div className="brand"><div className="brand-mark"><Ambulance size={22} strokeWidth={2.2} /></div><div className="brand-text"><strong>RESQ<span>TRACK</span></strong><small>LIVE AMBULANCE TRACKER</small></div><button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (window.innerWidth <= 700 ? "Close navigation" : "Expand sidebar") : "Collapse sidebar"}><ChevronLeft size={17} /></button></div>
    <div className="nav-caption">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activePage === id ? "active" : ""}`} onClick={() => { setActivePage(id); if (window.innerWidth <= 700) setCollapsed(false); if (id === "map") onMapFocus(); }} title={collapsed ? label : undefined}><Icon size={18} /><span>{label}</span>{id === "map" && <i className="nav-live-indicator" />}</button>)}</nav>
    <div className="sidebar-bottom"><button className={`connection-card ${paused ? "paused" : ""}`} onClick={onToggleSimulation}><span className="connection-icon"><Radio size={16} /></span><span className="connection-text"><strong>{paused ? "Simulation paused" : "Simulation running"}</strong><small><i />{paused ? "Resume demo updates" : "Local demo feed"}</small></span><span className="connection-toggle">{paused ? <Play size={14} /> : <Pause size={14} />}</span></button><div className="profile-row"><div className="avatar">DA</div><div className="profile-copy"><strong>Demo Administrator</strong><small>Operations manager</small></div><ChevronDown size={15} /></div></div>
  </aside>;
}

export default function App() {
  const [ambulances, setAmbulances] = useState(() => createDemoFleet());
  const [history, setHistory] = useState(() => createDemoFleet().flatMap((item) => item.history).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  const [now, setNow] = useState(Date.now());
  const [activePage, setActivePage] = useState("overview");
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [focusBounds, setFocusBounds] = useState(null);
  const [overviewToken, setOverviewToken] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [sort, setSort] = useState("id");
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState(() => {
    try { return { pollSeconds: 3, staleSeconds: 15, simulationSpeed: 1, apiUrl: import.meta.env.VITE_API_BASE_URL || "", ...JSON.parse(localStorage.getItem("resqtrack-settings") || "{}") }; }
    catch { return { pollSeconds: 3, staleSeconds: 15, simulationSpeed: 1, apiUrl: import.meta.env.VITE_API_BASE_URL || "" }; }
  });
  const [clock, setClock] = useState(new Date());
  const staleThreshold = settings.staleSeconds * 1000;
  const activeCount = ambulances.filter((item) => statusOf(item, now, staleThreshold) === "active").length;
  const staleCount = ambulances.length - activeCount;
  const averageSpeed = ambulances.length ? Math.round(ambulances.reduce((sum, item) => sum + item.speed, 0) / ambulances.length) : 0;
  const selectedAmbulance = ambulances.find((item) => item.id === selectedId);
  const currentPage = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0];

  const tickSimulation = () => {
    setAmbulances((current) => {
      const next = simulateFleetStep(current, settings.simulationSpeed);
      setHistory((previous) => [...next.map((item) => item.history[0]), ...previous].slice(0, 500));
      return next;
    });
    setNow(Date.now());
    setLastRefresh(Date.now());
  };

  const refresh = async () => {
    setNow(Date.now());
    if (settings.apiUrl.trim()) {
      try {
        const [health, remote] = await Promise.all([getHealth(settings.apiUrl), getAmbulances(settings.apiUrl)]);
        if (!health.ok) throw new Error("API health check failed");
        if (remote.length) {
          const mapped = remote.map((item) => ({ id: item.id || item.ambulanceId, lat: Number(item.lat), lng: Number(item.lng), speed: Number(item.speed || 0), updatedAt: item.updatedAt || item.timestamp || new Date().toISOString(), updateCount: item.updateCount || 0, history: [{ id: item.id || item.ambulanceId, lat: Number(item.lat), lng: Number(item.lng), speed: Number(item.speed || 0), updatedAt: item.updatedAt || item.timestamp || new Date().toISOString() }] }));
          setAmbulances(mapped);
          setHistory((previous) => [...mapped.map((item) => item.history[0]), ...previous].slice(0, 500));
        } else if (!paused) tickSimulation();
        setApiError("");
      } catch (error) {
        setApiError(`Backend unavailable (${error.message}). Showing simulated data.`);
        if (!paused) tickSimulation();
      }
    } else if (!paused) tickSimulation();
    setLastRefresh(Date.now());
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused) refresh();
      else setNow(Date.now());
    }, Math.max(1, settings.pollSeconds) * 1000);
    return () => clearInterval(timer);
  }, [paused, settings.pollSeconds, settings.staleSeconds, settings.simulationSpeed, settings.apiUrl]);
  useEffect(() => {
    if (settings.apiUrl.trim()) getHealth(settings.apiUrl).then((result) => { if (!result.ok) throw new Error("Health check failed"); setApiError(""); }).catch((error) => setApiError(`Backend unavailable (${error.message}). Showing simulated data.`));
  }, [settings.apiUrl]);

  const focusAmbulance = (item) => { setFocus({ lat: item.lat, lng: item.lng, nonce: Date.now() }); setActivePage("map"); };
  const focusAll = () => setFocusBounds(ambulances.map((item) => [item.lat, item.lng]));
  const returnOverview = () => setOverviewToken((value) => value + 1);
  const selectAmbulance = (id) => setSelectedId(id);
  const saveSettings = () => { localStorage.setItem("resqtrack-settings", JSON.stringify(settings)); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  const filteredAmbulances = useMemo(() => ambulances.filter((item) => item.id.toLowerCase().includes(search.toLowerCase())), [ambulances, search]);
  const notificationSelect = (id) => { setSelectedId(id); setNotificationsOpen(false); };
  const navTo = (id) => { setActivePage(id); setNotificationsOpen(false); };

  return <div className="app-shell"><Sidebar activePage={activePage} setActivePage={navTo} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} paused={paused} onToggleSimulation={() => setPaused((value) => !value)} onMapFocus={focusAll} />
    <main className={`main-content ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setSidebarCollapsed((value) => !value)} aria-label="Toggle navigation"><Menu size={19} /></button><div><div className="breadcrumb"><span>Operations</span><ChevronDown size={12} /><strong>{currentPage.label}</strong></div><h1>{activePage === "overview" ? "Good morning, Dispatcher" : currentPage.label}</h1></div></div>
        <div className="topbar-right"><label className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ambulance ID..." aria-label="Search ambulance fleet" /><kbd>⌘ K</kbd></label><div className="top-status"><span className="live-dot" /><span>Demo feed live</span></div><div className="top-clock"><strong>{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</strong><small>{clock.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</small></div><div className="notification-wrap"><button className={`icon-button top-notification ${notificationsOpen ? "pressed" : ""}`} onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications"><Bell size={18} />{staleCount > 0 && <i>{staleCount}</i>}</button>{notificationsOpen && <NotificationPanel ambulances={ambulances} now={now} staleThreshold={staleThreshold} onClose={() => setNotificationsOpen(false)} onSelect={notificationSelect} />}</div><button className="refresh-button" onClick={refresh} aria-label="Refresh dashboard"><RefreshCw size={15} /><span>Refresh</span></button></div>
      </header>
      {apiError && <div className="api-warning" role="status"><Siren size={16} /><span>{apiError}</span><button onClick={() => setApiError("")} aria-label="Dismiss API warning"><X size={15} /></button></div>}
      <div className="page-content">
        {(activePage === "overview" || activePage === "map") && <>
          {activePage === "overview" && <div className="welcome-row"><div><span className="eyebrow">{clock.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</span><h2>Fleet overview</h2><p>Here’s the latest status of your emergency response fleet.</p></div><div className="feed-state"><span className="feed-icon"><Radio size={16} /></span><span><strong>Live monitoring</strong><small>Last synced {formatTime(lastRefresh)}</small></span></div></div>}
          <div className="stats-grid"><StatCard icon={Ambulance} label="Total ambulances" value={ambulances.length} note="Vehicles in fleet" tone="blue" trend="FLEET" /><StatCard icon={Navigation} label="Active ambulances" value={activeCount} note="Reporting normally" tone="green" trend={`${ambulances.length ? Math.round(activeCount / ambulances.length * 100) : 0}%`} /><StatCard icon={Signal} label="Stale connections" value={staleCount} note="Needs connection check" tone="amber" trend={staleCount ? "ATTENTION" : "CLEAR"} /><StatCard icon={Gauge} label="Average speed" value={<>{averageSpeed}<small className="value-unit"> km/h</small></>} note="Across active vehicles" tone="coral" trend="LIVE" /></div>
          {activePage === "overview" && <div className="section-caption"><span>LIVE OPERATIONS</span><i /></div>}
          <LiveMap ambulances={ambulances} now={now} staleThreshold={staleThreshold} onSelect={selectAmbulance} focus={focus} bounds={focusBounds} overview={overviewToken} onFocusAll={focusAll} onOverview={returnOverview} onRefresh={refresh} />
          {activePage === "overview" && <AmbulanceTable ambulances={filteredAmbulances} now={now} staleThreshold={staleThreshold} query={search} setQuery={setSearch} filter={tableFilter} setFilter={setTableFilter} sort={sort} setSort={setSort} onSelect={selectAmbulance} onFocus={focusAmbulance} />}
          {activePage === "map" && <div className="map-page-summary"><div><span>ACTIVE UNITS</span><strong>{activeCount}</strong></div><div><span>STALE CONNECTIONS</span><strong>{staleCount}</strong></div><div><span>AVG. SPEED</span><strong>{averageSpeed} <small>km/h</small></strong></div><button className="simulation-control" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Resume simulation" : "Pause simulation"}</button></div>}
        </>}
        {activePage === "fleet" && <><div className="welcome-row compact-welcome"><div><span className="eyebrow">OPERATIONS / VEHICLES</span><h2>Ambulance fleet</h2><p>Monitor vehicle status and inspect simulated telemetry.</p></div><button className="simulation-control" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Resume simulation" : "Pause simulation"}</button></div><AmbulanceTable ambulances={filteredAmbulances} now={now} staleThreshold={staleThreshold} query={search} setQuery={setSearch} filter={tableFilter} setFilter={setTableFilter} sort={sort} setSort={setSort} onSelect={selectAmbulance} onFocus={focusAmbulance} /></>}
        {activePage === "history" && <HistoryPage history={history} ambulances={ambulances.map((item) => ({ ...item, status: statusOf(item, now, staleThreshold) }))} />}
        {activePage === "analytics" && <AnalyticsPage ambulances={ambulances} history={history} now={now} staleThreshold={staleThreshold} />}
        {activePage === "settings" && <SettingsPage settings={settings} setSettings={setSettings} saveSettings={saveSettings} saved={saved} />}
        <footer className="page-footer"><span>RESQTRACK <i /> LIVE AMBULANCE TRACKER</span><span>Simulation mode · Not connected to real GPS devices</span></footer>
      </div>
    </main>
    <DetailsPanel ambulance={selectedAmbulance} history={history} now={now} staleThreshold={staleThreshold} onClose={() => setSelectedId(null)} onFocus={focusAmbulance} />
  </div>;
}
