import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ─────────────────────── CONSTANTS ─────────────────────── */
const HANNIBAL_HQ = { lat: 38.5616, lng: -121.4686, label: "Hannibal's HQ" };
const TIMELINE_START = 300;
const TIMELINE_END = 1260;
const HOUR_LABELS = ["5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p"];

const SAMPLE_ORDERS = [
  { id:"274048", company:"UC Davis", event:"North Edition Building", contact:"Lori Simperman", phone:"916-734-0435",
    address:"2335 Stockton Blvd, Sacramento, CA 95817", lat:38.5530, lng:-121.4530, guests:250,
    deliveryTime:"06:00", servingTime:"07:00", setupMinutes:35,
    menu:"Breakfast Wraps (195 Bacon, 40 Vegetarian, 15 Vegan/GF) + Coffee & Tea",
    notes:"NO OJ · Hot boxes 7AM-9AM · NO STERNOS · Food labels needed · Client provides staff",
    pickup:{ type:"same-day", window:"10:00-16:00", note:"Same Day Pickup 10AM-4PM" },
    salesRep:"Brandon Paw", complexity:"large", room:"Room 1001, 3 Tables" },
  { id:"274047", company:"UC Davis", event:"Education Building", contact:"Christine", phone:"916-220-0804",
    address:"4610 X Street, Sacramento, CA 95817", lat:38.5505, lng:-121.4450, guests:60,
    deliveryTime:"06:30", servingTime:"07:00", setupMinutes:20,
    menu:"Breakfast Wraps (35 Bacon, 15 Vegetarian, 10 Vegan/GF) + Coffee & Tea",
    notes:"No OJ, add Tea · Coffee lids · Hot boxes 7AM-9AM · NO STERNOS · Food labels",
    pickup:{ type:"same-day", window:"10:00-16:00", note:"Coffee Cambro Pickup 10AM-4PM" },
    salesRep:"Brandon Paw", complexity:"medium", room:"1st Floor Lobby" },
  { id:"275836", company:"Mercy Medical", event:"MMG Breakfast – Loomis", contact:"Maria Moran", phone:"916-801-8376",
    address:"8041 Horseshoe Bar Rd, Loomis, CA 95650", lat:38.8200, lng:-121.1930, guests:18,
    deliveryTime:"07:45", servingTime:"08:30", setupMinutes:30,
    menu:"South of the Border Breakfast + Whole Fruit + Coffee/OJ + Chill Bins",
    notes:"⭐ VIP · Nice platters/bowls · China w/ linen · Décor (Olga's choice) · DECAF · Nice setup · 18mi out",
    pickup:{ type:"same-day", window:"12:00-14:00", note:"Equipment pickup at lunch" },
    salesRep:"Catherine Treadway", complexity:"vip", room:"Ask upon arrival",
    altContact:"Gurvinder Shaheed 916-580-7460", masterInvoice:"4160" },
  { id:"275701", company:"Golden 1 CU", event:"Boxed Meals", contact:"Yolanda Brown", phone:"916-296-4825",
    address:"8945 Cal Center Dr, Sacramento, CA 95826", lat:38.5580, lng:-121.3870, guests:65,
    deliveryTime:"10:15", servingTime:"10:30", setupMinutes:10,
    menu:"65 Street Taco Boxes (Chicken) + 5 Vegan/SW Tofu + Cookies",
    notes:"Security will direct at arrival",
    pickup:null, salesRep:"Lyuda Ignatyuk", complexity:"boxed", room:"Ask at arrival" },
  { id:"276142", company:"ACSA", event:"School Admins Lunch", contact:"Kristy Gilmore", phone:"707-696-8467",
    address:"1029 J St Suite 500, Sacramento, CA 95814", lat:38.5770, lng:-121.4930, guests:25,
    deliveryTime:"11:15", servingTime:"11:45", setupMinutes:20,
    menu:"Tri Tip & Marsala Chicken, Arugula Salad, Pasta Salad, Mashed Potatoes, Rolls, Cookies + Beverages",
    notes:"Décor included · High-quality disposable",
    pickup:null, salesRep:"Brandon Paw", complexity:"medium", room:"3rd Floor Conference Room" },
  { id:"274443", company:"Sutter Medical", event:"Neurology Section Mtg", contact:"Kim Mchaffie", phone:"454-6983",
    address:"2800 L St Suite 500, Sacramento, CA 95816", lat:38.5690, lng:-121.4780, guests:15,
    deliveryTime:"11:30", servingTime:"12:00", setupMinutes:15,
    menu:"Peasant Luncheon: Minestrone, Mesclun Cranberry Salad, Tri Color Pasta, Waldorf, Bread, Cookies",
    notes:"No beverages · Invoice attn Dana Green",
    pickup:null, salesRep:"", complexity:"small", room:"5th Floor, CR 501",
    altContact:"Lucia Ramirez 916-706-8580" },
  { id:"275968", company:"Mercy Medical", event:"MMG Lunch – Loomis", contact:"Maria Moran", phone:"916-801-8376",
    address:"8041 Horseshoe Bar Rd, Loomis, CA 95650", lat:38.8200, lng:-121.1930, guests:20,
    deliveryTime:"11:30", servingTime:"12:15", setupMinutes:30,
    menu:"BBQ Chicken + Soya Salmon + Penne Pasta (8 veg), Salads, Rice, Rolls, Bread Pudding, Coffee + Chill Bins",
    notes:"⭐ VIP · China w/ linen · Refresh AM décor · Nice chill bins · Bus tub & to-go boxes",
    pickup:{ type:"same-day", window:"14:00-16:00", note:"Same Day Pick-Up 2-4PM + AM equipment" },
    salesRep:"Catherine Treadway", complexity:"vip", room:"Ask upon arrival",
    altContact:"Gurvinder Shaheed 916-580-7460", masterInvoice:"4160" },
  { id:"275790", company:"Elk Grove PD", event:"Award Ceremony", contact:"Molly Patterson", phone:"916-627-3708",
    address:"8230 Civic Center Dr, Elk Grove, CA 95824", lat:38.4090, lng:-121.3720, guests:120,
    deliveryTime:"14:00", servingTime:"15:00", setupMinutes:45,
    menu:"Hors d'Oeuvres: Flatbread, Caprese, Samosas, Marsala Meatballs (ALL BEEF), Desserts + Bev Station",
    notes:"1 Server 2-6PM · Black/white décor · Venue provides (3) 8ft tables · ALL BEEF meatballs",
    pickup:{ type:"server-cleanup", window:"17:00-18:00", note:"Server cleanup ends 6PM" },
    salesRep:"Catherine Treadway", complexity:"large-event", room:"Main Event Space, District 56" },
  { id:"275827", company:"CNCDA", event:"New Car Dealers Assoc", contact:"Cathy Mason", phone:"916-207-1036",
    address:"1517 L St, Sacramento, CA 95814", lat:38.5770, lng:-121.4870, guests:30,
    deliveryTime:"15:30", servingTime:"17:00", setupMinutes:40,
    menu:"Hors d'Oeuvres: Caprese, Cheese, Pita, Chicken Piccata, Meatballs + Premium Bar 5-7PM",
    notes:"1 Server + 1 Bartender 3:30-8PM · Fully hosted bar · Ground floor/showroom",
    pickup:{ type:"server-cleanup", window:"19:00-20:00", note:"Staff cleanup by 8PM" },
    salesRep:"Catherine Treadway", complexity:"bar-event", room:"Ground Floor/Showroom" },
  { id:"276134", company:"K1 Speed", event:"K1 Speed", contact:"Michelle Nieves", phone:"(949) 250-0242 x3045",
    address:"3130 Bradshaw Rd, Sacramento, CA 95827", lat:38.5510, lng:-121.3560, guests:21,
    deliveryTime:"18:15", servingTime:"19:00", setupMinutes:10,
    menu:"BBQ Chicken Sandwiches, Tri Color Pasta Salad, Chips, Cookies",
    notes:"After hours delivery fee",
    pickup:{ type:"next-day", window:"10:00-16:00", note:"Next Day Pickup 10AM-4PM" },
    salesRep:"Catherine Treadway", complexity:"small", room:"Ask Upon Arrival" },
];

const DEFAULT_DRIVERS = [
  { id:"d1", name:"Driver 1", color:"#3b82f6", available:"05:00", end:"14:00" },
  { id:"d2", name:"Driver 2", color:"#f59e0b", available:"05:00", end:"14:00" },
  { id:"d3", name:"Driver 3", color:"#10b981", available:"07:00", end:"16:00" },
  { id:"d4", name:"Driver 4", color:"#ef4444", available:"10:00", end:"20:00" },
];

/* ─────────────────────── UTILITIES ─────────────────────── */
function tm(t) { const [h,m] = t.split(":").map(Number); return h * 60 + m; }
function fmt(m) {
  const h = Math.floor(m / 60), mn = m % 60, ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(mn).padStart(2, "0")} ${ap}`;
}
function fmtShort(m) {
  const h = Math.floor(m / 60), mn = m % 60, ap = h >= 12 ? "p" : "a";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return mn === 0 ? `${h12}${ap}` : `${h12}:${String(mn).padStart(2, "0")}${ap}`;
}

function haversineMiles(a, b) {
  const R = 3959;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function fallbackDriveMin(a, b) {
  const d = haversineMiles(a, b);
  return Math.ceil((d / (d > 15 ? 38 : d > 5 ? 28 : 20)) * 60) + 4;
}

function loadMinutes(c) {
  return c === "large" || c === "large-event" ? 30
    : c === "vip" || c === "bar-event" ? 25
    : c === "medium" ? 18 : 12;
}

function complexBadge(c) {
  const m = {
    large: ["LRG", "#fca5a5", "#7f1d1d"],
    "large-event": ["EVENT", "#fca5a5", "#7f1d1d"],
    vip: ["VIP", "#fbbf24", "#78350f"],
    medium: ["MED", "#93c5fd", "#1e3a5f"],
    boxed: ["BOX", "#86efac", "#14532d"],
    small: ["SM", "#86efac", "#14532d"],
    "bar-event": ["BAR", "#c4b5fd", "#3b1f6e"],
  };
  return m[c] || ["?", "#999", "#333"];
}

function getCachedDrive(cache, a, b) {
  const key = `${a.lat.toFixed(4)},${a.lng.toFixed(4)}->${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  if (cache[key] != null) return cache[key];
  return fallbackDriveMin(a, b);
}

/* ─────── Google Maps Distance Matrix ─────── */
async function fetchGoogleDriveTimes(apiKey, origins, destinations) {
  const origStr = origins.map(o => `${o.lat},${o.lng}`).join("|");
  const destStr = destinations.map(d => `${d.lat},${d.lng}`).join("|");
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origStr)}&destinations=${encodeURIComponent(destStr)}&departure_time=now&key=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.status !== "OK") throw new Error(d.error_message || d.status);
  return d.rows;
}

async function buildDriveCache(apiKey, locations) {
  const cache = {};
  const BATCH = 10;
  for (let i = 0; i < locations.length; i += BATCH) {
    const origBatch = locations.slice(i, i + BATCH);
    try {
      const rows = await fetchGoogleDriveTimes(apiKey, origBatch, locations);
      rows.forEach((row, ri) => {
        row.elements.forEach((el, ci) => {
          const orig = origBatch[ri];
          const dest = locations[ci];
          const key = `${orig.lat.toFixed(4)},${orig.lng.toFixed(4)}->${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`;
          if (el.status === "OK") {
            const secs = el.duration_in_traffic?.value || el.duration?.value || 0;
            cache[key] = Math.ceil(secs / 60);
          }
        });
      });
    } catch {
      origBatch.forEach(orig => {
        locations.forEach(dest => {
          const key = `${orig.lat.toFixed(4)},${orig.lng.toFixed(4)}->${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`;
          if (!cache[key]) cache[key] = fallbackDriveMin(orig, dest);
        });
      });
    }
  }
  return cache;
}

/* ─────── Pickup Route Optimizer (nearest-neighbor TSP) ─────── */
function optimizePickupRoute(pickups, driveCache) {
  if (pickups.length <= 1) return pickups;
  const visited = new Set();
  const route = [];
  let current = HANNIBAL_HQ;
  while (route.length < pickups.length) {
    let best = null, bestDist = Infinity;
    for (const p of pickups) {
      if (visited.has(p.id)) continue;
      const d = getCachedDrive(driveCache, current, p);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (!best) break;
    visited.add(best.id);
    route.push(best);
    current = best;
  }
  return route;
}

function groupPickupRuns(pickups, driveCache) {
  const byWindow = {};
  pickups.forEach(p => {
    const key = p.pickup.window;
    if (!byWindow[key]) byWindow[key] = [];
    byWindow[key].push(p);
  });
  const runs = [];
  Object.entries(byWindow).forEach(([window, items]) => {
    const optimized = optimizePickupRoute(items, driveCache);
    let totalDrive = getCachedDrive(driveCache, HANNIBAL_HQ, optimized[0]);
    for (let i = 1; i < optimized.length; i++)
      totalDrive += getCachedDrive(driveCache, optimized[i - 1], optimized[i]);
    totalDrive += getCachedDrive(driveCache, optimized[optimized.length - 1], HANNIBAL_HQ);
    const totalPickupTime = optimized.reduce(
      (s, o) => s + (o.guests > 100 ? 15 : o.complexity === "vip" ? 12 : 8), 0
    );
    const [ws, we] = window.split("-");
    runs.push({
      window, windowStart: tm(ws), windowEnd: tm(we),
      stops: optimized, totalDrive, totalPickupTime,
      totalTime: totalDrive + totalPickupTime,
    });
  });
  return runs.sort((a, b) => a.windowStart - b.windowStart);
}

/* ─────── Auto-assignment Engine ─────── */
function autoAssign(orders, drivers, driveCache) {
  const sorted = [...orders].sort((a, b) => tm(a.deliveryTime) - tm(b.deliveryTime));
  const assignments = {};
  const dt = {};
  drivers.forEach(d => {
    dt[d.id] = { t: tm(d.available), lat: HANNIBAL_HQ.lat, lng: HANNIBAL_HQ.lng };
  });

  // Batch Loomis orders to same driver
  const loomis = sorted.filter(o => o.address.includes("Loomis"));
  const others = sorted.filter(o => !o.address.includes("Loomis"));

  if (loomis.length >= 2) {
    const best = drivers.reduce((b, d) => {
      const drive = getCachedDrive(driveCache, HANNIBAL_HQ, loomis[0]);
      const need = tm(loomis[0].deliveryTime) - drive - loadMinutes(loomis[0].complexity);
      if (dt[d.id].t <= need && (!b || dt[d.id].t <= dt[b.id].t)) return d;
      return b || d;
    }, null);
    loomis.forEach(o => { assignments[o.id] = best.id; });
    const last = loomis[loomis.length - 1];
    const ret = getCachedDrive(driveCache, last, HANNIBAL_HQ);
    dt[best.id].t = tm(last.deliveryTime) + last.setupMinutes + 15 + ret;
    dt[best.id].lat = HANNIBAL_HQ.lat;
    dt[best.id].lng = HANNIBAL_HQ.lng;
  }

  others.forEach(o => {
    let best = null, bestScore = Infinity;
    drivers.forEach(d => {
      if (tm(d.end) < tm(o.deliveryTime) + o.setupMinutes) return;
      const s = dt[d.id];
      const drive = getCachedDrive(driveCache, { lat: s.lat, lng: s.lng }, o);
      const load = loadMinutes(o.complexity);
      const depart = s.t + load;
      const arrive = depart + drive;
      const slack = tm(o.deliveryTime) - arrive;
      if (slack < -15) return;
      const score = drive + Math.max(0, slack) * 0.4 + (slack < 0 ? Math.abs(slack) * 6 : 0);
      if (score < bestScore) { bestScore = score; best = d; }
    });
    if (!best) best = drivers[0];
    assignments[o.id] = best.id;
    const drive = getCachedDrive(driveCache, { lat: dt[best.id].lat, lng: dt[best.id].lng }, o);
    dt[best.id].t = Math.max(
      dt[best.id].t + loadMinutes(o.complexity) + drive,
      tm(o.deliveryTime)
    ) + o.setupMinutes;
    dt[best.id].lat = o.lat;
    dt[best.id].lng = o.lng;
  });
  return assignments;
}

/* ─────── Schedule Builder ─────── */
function buildSchedule(orders, assignments, drivers, driveCache) {
  const sched = {};
  drivers.forEach(d => { sched[d.id] = []; });
  const grouped = {};
  drivers.forEach(d => { grouped[d.id] = []; });
  orders.forEach(o => {
    const did = assignments[o.id];
    if (did && grouped[did]) grouped[did].push(o);
  });

  Object.keys(grouped).forEach(did => {
    const ords = grouped[did].sort((a, b) => tm(a.deliveryTime) - tm(b.deliveryTime));
    let cur = { lat: HANNIBAL_HQ.lat, lng: HANNIBAL_HQ.lng };
    let t = tm(drivers.find(d => d.id === did).available);

    ords.forEach(o => {
      const load = loadMinutes(o.complexity);
      const drive = getCachedDrive(driveCache, cur, o);
      const delMin = tm(o.deliveryTime);
      const loadStart = Math.max(t, delMin - drive - load - 10);
      const departT = loadStart + load;
      const arriveT = departT + drive;

      sched[did].push({
        type: "load", orderId: o.id, start: loadStart, duration: load,
        label: `Load ${o.company}`, detail: `${o.guests}p · ${load}min`,
      });
      sched[did].push({
        type: "drive", orderId: o.id, start: departT, duration: drive,
        label: `→ ${o.company}`, detail: `${drive}min`,
      });
      sched[did].push({
        type: "setup", orderId: o.id, start: arriveT, duration: o.setupMinutes,
        label: `Setup: ${o.event}`, detail: `${o.guests}p · ${o.room || ""}`,
      });

      t = arriveT + o.setupMinutes;
      cur = { lat: o.lat, lng: o.lng };
    });

    if (ords.length > 0) {
      const ret = getCachedDrive(driveCache, cur, HANNIBAL_HQ);
      sched[did].push({ type: "return", start: t, duration: ret, label: "→ HQ", detail: `${ret}min` });
    }
  });
  return sched;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN APP COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function App() {
  const [orders] = useState(SAMPLE_ORDERS);
  const [drivers, setDrivers] = useState(DEFAULT_DRIVERS);
  const [assignments, setAssignments] = useState({});
  const [schedule, setSchedule] = useState({});
  const [driveCache, setDriveCache] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState("timeline");
  const [editingDriver, setEditingDriver] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [apiStatus, setApiStatus] = useState("none");
  const [dragState, setDragState] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [pickupRuns, setPickupRuns] = useState([]);

  const rebuild = useCallback((asgn, dc) => {
    const c = dc || driveCache;
    const s = buildSchedule(orders, asgn, drivers, c);
    setSchedule(s);
    const pickups = orders.filter(o => o.pickup && o.pickup.type === "same-day");
    setPickupRuns(groupPickupRuns(pickups, c));
  }, [orders, drivers, driveCache]);

  useEffect(() => {
    const a = autoAssign(orders, drivers, driveCache);
    setAssignments(a);
    rebuild(a, driveCache);
  }, [orders, drivers]);

  // Google Maps fetch
  const fetchAllDriveTimes = useCallback(async () => {
    if (!apiKey) { setApiStatus("missing"); return; }
    setMapsLoading(true);
    setApiStatus("loading");
    const locations = [HANNIBAL_HQ, ...orders];
    try {
      const cache = await buildDriveCache(apiKey, locations);
      setDriveCache(cache);
      const a = autoAssign(orders, drivers, cache);
      setAssignments(a);
      rebuild(a, cache);
      setApiStatus("ok");
    } catch (e) {
      console.error("Maps API error:", e);
      setApiStatus(e.message?.includes("Failed to fetch") ? "cors" : "error");
    }
    setMapsLoading(false);
  }, [apiKey, orders, drivers, rebuild]);

  // Drag & Drop handlers
  const handleDragStart = (e, orderId, fromDriverId) => {
    setDragState({ orderId, fromDriverId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", orderId);
    if (e.target?.style) e.target.style.opacity = "0.4";
  };
  const handleDragOver = (e, driverId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== driverId) setDropTarget(driverId);
  };
  const handleDragLeave = (e) => {
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
    }
  };
  const handleDrop = (e, toDriverId) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragState) return;
    const updated = { ...assignments, [dragState.orderId]: toDriverId };
    setAssignments(updated);
    rebuild(updated, driveCache);
    setDragState(null);
  };
  const handleDragEnd = (e) => {
    if (e.target?.style) e.target.style.opacity = "1";
    setDragState(null);
    setDropTarget(null);
  };
  const handleReassign = (orderId, newDriverId) => {
    const updated = { ...assignments, [orderId]: newDriverId };
    setAssignments(updated);
    rebuild(updated, driveCache);
  };

  // Computed values
  const stats = useMemo(() => {
    const g = orders.reduce((s, o) => s + o.guests, 0);
    const e = orders.reduce((m, o) => Math.min(m, tm(o.deliveryTime)), Infinity);
    const l = orders.reduce((m, o) => Math.max(m, tm(o.deliveryTime)), 0);
    const driverLoads = {};
    drivers.forEach(d => { driverLoads[d.id] = 0; });
    Object.entries(assignments).forEach(([oid, did]) => {
      const o = orders.find(x => x.id === oid);
      if (o && driverLoads[did] != null) driverLoads[did] += o.guests;
    });
    return { totalOrders: orders.length, totalGuests: g, earliest: fmt(e), latest: fmt(l), driverLoads };
  }, [orders, assignments, drivers]);

  const dc = (did) => drivers.find(d => d.id === did)?.color || "#555";
  const dn = (did) => drivers.find(d => d.id === did)?.name || "—";
  const nowMin = useMemo(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }, []);

  const allPickups = useMemo(() =>
    orders.filter(o => o.pickup).map(o => ({
      ...o,
      ws: o.pickup.window.split("-")[0],
      we: o.pickup.window.split("-")[1],
      driver: assignments[o.id],
    })).sort((a, b) => tm(a.ws) - tm(b.ws)),
  [orders, assignments]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  /* ━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━ */
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ─── HEADER ─── */}
      <div className="hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div className="brand">HANNIBAL'S <em>DISPATCH</em></div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <div className="pill"><b>{stats.totalOrders}</b><span>Orders</span></div>
            <div className="pill"><b>{stats.totalGuests}</b><span>Guests</span></div>
            <div className="pill"><b>{stats.earliest}</b><span>First</span></div>
            <div className="pill"><b>{stats.latest}</b><span>Last</span></div>
          </div>
          <div style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 600, letterSpacing: .5,
            background: apiStatus === "ok" ? "#132010" : "#111520",
            color: apiStatus === "ok" ? "#86efac" : "#5b6b82",
          }}>
            {apiStatus === "ok" ? "● LIVE MAPS" : "○ ESTIMATES"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#5b6b82" }}>{today}</div>
          <div className="tabs">
            {[["timeline", "⏱ Timeline"], ["orders", "📋 Orders"], ["pickups", "📦 Pickups"], ["settings", "⚙ Maps"]].map(([v, l]) => (
              <button key={v} className={`tab ${view === v ? "on" : ""}`} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        {/* ─── SIDEBAR ─── */}
        <div className="side">
          <div className="sec">
            <div className="stitle">Drivers — drag orders to reassign</div>
            {drivers.map(d => {
              const cnt = Object.values(assignments).filter(a => a === d.id).length;
              const guests = stats.driverLoads[d.id] || 0;
              const isEdit = editingDriver === d.id;
              const isDrop = dropTarget === d.id;
              return (
                <div key={d.id}
                  className={`dcard ${isEdit ? "editing" : ""} ${isDrop ? "drop-target" : ""}`}
                  onClick={() => setEditingDriver(isEdit ? null : d.id)}
                  onDragOver={e => handleDragOver(e, d.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, d.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <div className="ddot" style={{ background: d.color }} />
                    {isEdit ? (
                      <input className="dinput" value={d.name}
                        onChange={e => { e.stopPropagation(); setDrivers(p => p.map(x => x.id === d.id ? { ...x, name: e.target.value } : x)); }}
                        onClick={e => e.stopPropagation()} autoFocus />
                    ) : (
                      <span style={{ fontWeight: 600, color: "#dde3ec", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{d.name}</span>
                    )}
                  </div>
                  {isEdit ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "#5b6b82" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ width: 36 }}>Start:</span>
                        <input className="dinput" type="time" value={d.available}
                          onChange={e => { e.stopPropagation(); setDrivers(p => p.map(x => x.id === d.id ? { ...x, available: e.target.value } : x)); }}
                          onClick={e => e.stopPropagation()} style={{ width: 100 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ width: 36 }}>End:</span>
                        <input className="dinput" type="time" value={d.end}
                          onChange={e => { e.stopPropagation(); setDrivers(p => p.map(x => x.id === d.id ? { ...x, end: e.target.value } : x)); }}
                          onClick={e => e.stopPropagation()} style={{ width: 100 }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#5b6b82" }}>{fmtShort(tm(d.available))} – {fmtShort(tm(d.end))}</div>
                  )}
                  <div style={{ fontSize: 10, color: "#5b6b82", marginTop: 3 }}>
                    {cnt} deliver{cnt !== 1 ? "ies" : "y"} · {guests} guests
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sec">
            <div className="stitle">Orders ({orders.length})</div>
            {[...orders].sort((a, b) => tm(a.deliveryTime) - tm(b.deliveryTime)).map(o => {
              const did = assignments[o.id];
              const [bt, bc, bb] = complexBadge(o.complexity);
              const isDragging = dragState?.orderId === o.id;
              return (
                <div key={o.id}
                  className={`ocard ${selectedOrder === o.id ? "sel" : ""}`}
                  style={{ opacity: isDragging ? .35 : 1 }}
                  onClick={() => setSelectedOrder(selectedOrder === o.id ? null : o.id)}
                  draggable
                  onDragStart={e => handleDragStart(e, o.id, did)}
                  onDragEnd={handleDragEnd}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <div className="otime">{fmtShort(tm(o.deliveryTime))}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <div className="badge" style={{ background: bb, color: bc }}>{o.guests}p</div>
                      <div className="badge" style={{ background: bb, color: bc }}>{bt}</div>
                    </div>
                  </div>
                  <div className="ocomp">{o.company}</div>
                  <div className="odet">{o.event}</div>
                  <div className="odet" style={{ marginTop: 2 }}>{o.address.split(",")[0]}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <select className="dsel" value={did || ""}
                      onChange={e => { e.stopPropagation(); handleReassign(o.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      style={{ borderLeft: `3px solid ${dc(did)}` }}
                    >
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <span style={{ fontSize: 9, color: "#3d4d63" }}>#{o.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ═══ TIMELINE ═══ */}
          {view === "timeline" && (
            <>
              <div className="tl-wrap">
                <div style={{ minWidth: 1100 }}>
                  <div className="tl-hdr">
                    {HOUR_LABELS.map(h => <div key={h} className="tl-h">{h}</div>)}
                  </div>
                  {drivers.map(d => {
                    const blocks = schedule[d.id] || [];
                    const totalMin = TIMELINE_END - TIMELINE_START;
                    const isDrop = dropTarget === d.id;
                    return (
                      <div key={d.id}
                        className={`tl-row ${isDrop ? "drop-over" : ""}`}
                        onDragOver={e => handleDragOver(e, d.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, d.id)}
                      >
                        <div className="tl-lbl">
                          <div className="ddot" style={{ background: d.color }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#dde3ec", fontFamily: "'DM Sans',sans-serif" }}>{d.name}</span>
                        </div>
                        <div className="tl-track">
                          {HOUR_LABELS.map((_, i) => (
                            <div key={i} style={{
                              position: "absolute", left: `${(i / HOUR_LABELS.length) * 100}%`,
                              top: 0, bottom: 0, width: 1, background: "#12161f",
                            }} />
                          ))}
                          {nowMin >= TIMELINE_START && nowMin <= TIMELINE_END && d === drivers[0] && (
                            <div className="now" style={{
                              left: `${((nowMin - TIMELINE_START) / totalMin) * 100}%`,
                              bottom: `-${(drivers.length - 1) * 52 + 20}px`,
                            }} />
                          )}
                          {blocks.map((blk, i) => {
                            const left = ((blk.start - TIMELINE_START) / totalMin) * 100;
                            const width = (blk.duration / totalMin) * 100;
                            if (left > 100 || left + width < 0) return null;
                            const canDrag = !!blk.orderId;
                            return (
                              <div key={i} className={`tl-blk ${blk.type}`}
                                style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(.3, width)}%`, background: d.color }}
                                title={`${blk.label}\n${fmt(blk.start)} – ${fmt(blk.start + blk.duration)}\n${blk.detail || ""}`}
                                onClick={() => blk.orderId && setSelectedOrder(blk.orderId)}
                                draggable={canDrag}
                                onDragStart={e => canDrag && handleDragStart(e, blk.orderId, d.id)}
                                onDragEnd={handleDragEnd}
                              >
                                {width > 2 && <span style={{ fontSize: 8, overflow: "hidden", textOverflow: "ellipsis" }}>{blk.label}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pickup windows on timeline */}
                  {allPickups.filter(p => p.pickup.type === "same-day").length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #151b27", paddingTop: 8 }}>
                      <div style={{ marginLeft: 110, marginBottom: 6, fontSize: 9, color: "#3d4d63", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Pickup Windows</div>
                      {allPickups.filter(p => p.pickup.type === "same-day").map(p => {
                        const totalMin = TIMELINE_END - TIMELINE_START;
                        const sMin = tm(p.ws), eMin = tm(p.we);
                        const left = ((sMin - TIMELINE_START) / totalMin) * 100;
                        const width = ((eMin - sMin) / totalMin) * 100;
                        return (
                          <div key={p.id} className="tl-row" style={{ height: 30 }}>
                            <div className="tl-lbl"><span style={{ fontSize: 9, color: "#5b6b82" }}>📦 {p.company}</span></div>
                            <div className="tl-track" style={{ height: 22 }}>
                              {HOUR_LABELS.map((_, i) => (
                                <div key={i} style={{ position: "absolute", left: `${(i / HOUR_LABELS.length) * 100}%`, top: 0, bottom: 0, width: 1, background: "#12161f" }} />
                              ))}
                              <div style={{
                                position: "absolute", left: `${left}%`, width: `${width}%`,
                                height: 16, top: 3, background: "#0f1a12", border: "1px dashed #22c55e33",
                                borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 7,
                                fontSize: 8, color: "#86efac",
                              }}>
                                {fmtShort(sMin)}–{fmtShort(eMin)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Panel */}
              {selectedOrder && (() => {
                const o = orders.find(x => x.id === selectedOrder);
                if (!o) return null;
                const driveHQ = getCachedDrive(driveCache, HANNIBAL_HQ, o);
                const miles = haversineMiles(HANNIBAL_HQ, o).toFixed(1);
                return (
                  <div className="detail fade-in" key={selectedOrder}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 17, color: "#eef1f6" }}>{o.company}</div>
                        <div style={{ fontSize: 12, color: "#5b6b82" }}>{o.event} · Invoice #{o.id}</div>
                      </div>
                      <button onClick={() => setSelectedOrder(null)} style={{ background: "#151b27", border: "1px solid #1c2333", borderRadius: 5, padding: "3px 10px", color: "#5b6b82", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>✕</button>
                    </div>
                    <div className="dgrid">
                      <div><div className="dlbl">Delivery</div><div className="dval">{fmt(tm(o.deliveryTime))}</div></div>
                      <div><div className="dlbl">Serving</div><div className="dval">{fmt(tm(o.servingTime))}</div></div>
                      <div><div className="dlbl">Guests</div><div className="dval">{o.guests}</div></div>
                      <div><div className="dlbl">Setup</div><div className="dval">{o.setupMinutes} min</div></div>
                      <div><div className="dlbl">Drive from HQ</div><div className="dval">~{driveHQ} min · {miles} mi</div></div>
                      <div><div className="dlbl">Load Time</div><div className="dval">{loadMinutes(o.complexity)} min</div></div>
                      <div><div className="dlbl">Contact</div><div className="dval">{o.contact} · {o.phone}</div></div>
                      <div><div className="dlbl">Location</div><div className="dval">{o.room}</div></div>
                      <div><div className="dlbl">Driver</div><div className="dval" style={{ color: dc(assignments[o.id]) }}>{dn(assignments[o.id])}</div></div>
                      <div style={{ gridColumn: "1/-1" }}><div className="dlbl">Address</div><div className="dval">{o.address}</div></div>
                      <div style={{ gridColumn: "1/-1" }}><div className="dlbl">Menu</div><div className="dval" style={{ fontSize: 11, lineHeight: 1.7 }}>{o.menu}</div></div>
                    </div>
                    {o.notes && <div className="nbox">⚠ {o.notes}</div>}
                    {o.pickup && <div style={{ marginTop: 8, background: "#0f1a12", border: "1px solid #1a3020", borderRadius: 5, padding: 8, fontSize: 11, color: "#86efac" }}>📦 {o.pickup.note}</div>}
                    {o.altContact && <div style={{ marginTop: 6, fontSize: 10, color: "#5b6b82" }}>Alt: {o.altContact}</div>}
                  </div>
                );
              })()}
            </>
          )}

          {/* ═══ ORDERS ═══ */}
          {view === "orders" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {[...orders].sort((a, b) => tm(a.deliveryTime) - tm(b.deliveryTime)).map((o, idx) => {
                  const [bt, bc, bb] = complexBadge(o.complexity);
                  return (
                    <div key={o.id} className="fade-in" style={{ animationDelay: `${idx * 25}ms`, background: "#10141c", border: "1px solid #181e2a", borderRadius: 9, padding: 16, borderLeft: `4px solid ${dc(assignments[o.id])}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#eef1f6" }}>{o.company}</div>
                          <div style={{ fontSize: 11, color: "#5b6b82", marginTop: 2 }}>{o.event}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#eef1f6", fontFamily: "'DM Sans',sans-serif" }}>{fmtShort(tm(o.deliveryTime))}</div>
                          <div style={{ fontSize: 10, color: "#5b6b82" }}>Serve {fmtShort(tm(o.servingTime))}</div>
                        </div>
                      </div>
                      <div className="dgrid" style={{ marginBottom: 10 }}>
                        <div><div className="dlbl">Guests</div><div className="dval">{o.guests}</div></div>
                        <div><div className="dlbl">Setup</div><div className="dval">{o.setupMinutes} min</div></div>
                        <div><div className="dlbl">Type</div><div className="badge" style={{ background: bb, color: bc }}>{bt}</div></div>
                        <div><div className="dlbl">Contact</div><div className="dval">{o.contact}</div></div>
                        <div><div className="dlbl">Phone</div><div className="dval">{o.phone}</div></div>
                        <div><div className="dlbl">Driver</div><div className="dval" style={{ color: dc(assignments[o.id]) }}>{dn(assignments[o.id])}</div></div>
                        <div style={{ gridColumn: "1/-1" }}><div className="dlbl">Address</div><div className="dval">{o.address} · {o.room}</div></div>
                      </div>
                      <div><div className="dlbl">Menu</div><div className="dval" style={{ fontSize: 11, lineHeight: 1.6 }}>{o.menu}</div></div>
                      {o.notes && <div className="nbox">⚠ {o.notes}</div>}
                      {o.pickup && <div style={{ marginTop: 8, background: "#0f1a12", border: "1px solid #1a3020", borderRadius: 5, padding: 8, fontSize: 11, color: "#86efac" }}>📦 {o.pickup.note}</div>}
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#3d4d63" }}>
                        <span>Invoice #{o.id} · {o.salesRep || "—"}</span>
                        {o.masterInvoice && <span style={{ color: "#f59e0b" }}>Master #{o.masterInvoice}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ PICKUPS ═══ */}
          {view === "pickups" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 18, color: "#eef1f6", marginBottom: 4 }}>Pickup Route Optimizer</div>
              <div style={{ fontSize: 12, color: "#5b6b82", marginBottom: 20 }}>
                Nearest-neighbor TSP routing groups stops by time window{apiStatus === "ok" ? " · live Google Maps data" : ""}
              </div>

              {pickupRuns.map((run, ri) => (
                <div key={ri} className="pk-run fade-in" style={{ animationDelay: `${ri * 60}ms` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#86efac" }}>
                        Run {ri + 1}: {fmtShort(run.windowStart)} – {fmtShort(run.windowEnd)}
                      </div>
                      <div style={{ fontSize: 10, color: "#5b6b82", marginTop: 2 }}>{run.stops.length} stop{run.stops.length > 1 ? "s" : ""} · optimized order</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, color: "#86efac", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{run.totalTime} min</div>
                      <div style={{ fontSize: 9, color: "#5b6b82" }}>total run time</div>
                    </div>
                  </div>

                  <div style={{ paddingLeft: 4 }}>
                    <div className="pk-stop">
                      <div className="pk-num" style={{ background: "#1a1810", color: "#f59e0b", fontSize: 13 }}>⬤</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#dde3ec", fontFamily: "'DM Sans',sans-serif" }}>Depart Hannibal's HQ</div>
                        <div style={{ fontSize: 10, color: "#5b6b82" }}>Suggested depart: ~{fmtShort(Math.max(TIMELINE_START, run.windowStart - run.totalDrive - 10))}</div>
                      </div>
                    </div>
                    {run.stops.map((stop, si) => {
                      const prev = si === 0 ? HANNIBAL_HQ : run.stops[si - 1];
                      const drvMin = getCachedDrive(driveCache, prev, stop);
                      const pickMin = stop.guests > 100 ? 15 : stop.complexity === "vip" ? 12 : 8;
                      return (
                        <div key={stop.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 10px" }}>
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#1a3020" }} />
                            <div style={{ fontSize: 9, color: "#5b6b82", fontStyle: "italic" }}>{drvMin} min drive →</div>
                          </div>
                          <div className="pk-stop">
                            <div className="pk-num">{si + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#dde3ec", fontFamily: "'DM Sans',sans-serif" }}>{stop.company}</div>
                                  <div style={{ fontSize: 10, color: "#5b6b82", marginTop: 1 }}>{stop.address}</div>
                                </div>
                                <div style={{ textAlign: "right", fontSize: 10, color: "#5b6b82" }}>
                                  <div>~{pickMin} min load</div>
                                  <div>{stop.guests} guests</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 10, color: "#86efac", marginTop: 4 }}>{stop.pickup.note}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 10px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: "#1a3020" }} />
                      <div style={{ fontSize: 9, color: "#5b6b82", fontStyle: "italic" }}>
                        {getCachedDrive(driveCache, run.stops[run.stops.length - 1], HANNIBAL_HQ)} min drive →
                      </div>
                    </div>
                    <div className="pk-stop" style={{ borderBottom: "none" }}>
                      <div className="pk-num" style={{ background: "#1a1810", color: "#f59e0b", fontSize: 13 }}>⬤</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#dde3ec", fontFamily: "'DM Sans',sans-serif" }}>Return to HQ</div>
                    </div>
                  </div>

                  <div className="pk-total">
                    <span>🚐 {run.totalDrive} min drive</span>
                    <span>📦 {run.totalPickupTime} min load</span>
                    <span>⏱ {run.totalTime} min total</span>
                    <span>📍 {run.stops.length} stops</span>
                  </div>
                </div>
              ))}

              {allPickups.filter(p => p.pickup.type === "server-cleanup").length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="stitle">Server-Managed Cleanup</div>
                  <div style={{ fontSize: 11, color: "#5b6b82", marginBottom: 10 }}>On-site staff handles breakdown</div>
                  {allPickups.filter(p => p.pickup.type === "server-cleanup").map(p => (
                    <div key={p.id} className="pkcard">
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "#dde3ec" }}>{p.company} – {p.event}</div>
                          <div style={{ fontSize: 10, color: "#5b6b82", marginTop: 2 }}>{p.address}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600 }}>{fmtShort(tm(p.ws))}–{fmtShort(tm(p.we))}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 6 }}>{p.pickup.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {allPickups.filter(p => p.pickup.type === "next-day").length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="stitle">Next-Day Pickups</div>
                  {allPickups.filter(p => p.pickup.type === "next-day").map(p => (
                    <div key={p.id} className="pkcard">
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "#dde3ec" }}>{p.company} – {p.event}</div>
                      <div style={{ fontSize: 10, color: "#5b6b82", marginTop: 2 }}>{p.address}</div>
                      <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>⏰ {p.pickup.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {orders.filter(o => !o.pickup).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="stitle">No Pickup (Disposable Only)</div>
                  {orders.filter(o => !o.pickup).map(o => (
                    <div key={o.id} style={{ background: "#10141c", border: "1px solid #181e2a", borderRadius: 6, padding: 8, marginBottom: 5, fontSize: 11, color: "#5b6b82" }}>
                      {o.company} – {o.event} · {o.address.split(",")[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {view === "settings" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 680 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 18, color: "#eef1f6", marginBottom: 4 }}>Google Maps Integration</div>
              <div style={{ fontSize: 12, color: "#5b6b82", marginBottom: 16 }}>
                Enter your Google Maps API key to get real drive times with live traffic data. The Distance Matrix API must be enabled.
              </div>

              <div className="api-bar">
                <div style={{ fontSize: 11, color: "#5b6b82", marginBottom: 2, fontWeight: 600 }}>Google Maps API Key</div>
                <input className="api-input" type="password" placeholder="AIzaSy..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="api-btn" onClick={fetchAllDriveTimes} disabled={mapsLoading}>
                    {mapsLoading ? "Fetching..." : "Fetch Live Drive Times"}
                  </button>
                  {apiStatus === "ok" && <div style={{ fontSize: 10, color: "#86efac" }}>✓ {Object.keys(driveCache).length} routes cached</div>}
                  {apiStatus === "error" && <div style={{ fontSize: 10, color: "#ef4444" }}>✗ API error — check key & billing</div>}
                  {apiStatus === "cors" && <div style={{ fontSize: 10, color: "#f59e0b" }}>! CORS blocked — needs server proxy</div>}
                  {apiStatus === "missing" && <div style={{ fontSize: 10, color: "#f59e0b" }}>! Enter API key first</div>}
                </div>
                {apiStatus === "cors" && (
                  <div style={{ marginTop: 10, background: "#1a1610", border: "1px solid #3d2e0a", borderRadius: 6, padding: 10, fontSize: 11, color: "#f59e0b", lineHeight: 1.7 }}>
                    Google's Distance Matrix API doesn't allow direct browser requests. You'll need a lightweight server proxy (e.g. a Cloudflare Worker) that forwards requests. The haversine estimates are reasonably accurate for Sacramento metro routing in the meantime.
                  </div>
                )}
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#eef1f6", marginBottom: 12 }}>How the Engine Works</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    ["🚐 Auto-Assignment", "Orders sorted by delivery time. Each assigned to driver with lowest cost score factoring drive time, slack, and shift hours. Loomis orders batched."],
                    ["📦 Pickup Optimizer", "Same-day pickups grouped by window. Nearest-neighbor TSP finds shortest route from HQ. Load time scaled by order size."],
                    ["✋ Drag & Drop", "Grab any order from sidebar or timeline block. Drop onto driver card or row. Schedule recomputes instantly."],
                    ["🗺 Google Maps", "Replaces estimates with real Distance Matrix times including traffic. All pairs cached in batch."],
                  ].map(([title, desc], i) => (
                    <div key={i} style={{ background: "#10141c", border: "1px solid #181e2a", borderRadius: 7, padding: 14 }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "#dde3ec", marginBottom: 4 }}>{title}</div>
                      <div style={{ fontSize: 11, color: "#5b6b82", lineHeight: 1.7 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
