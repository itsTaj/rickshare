/*
  RickShare Live Tracking (client/src/live.js)
  Purpose: Display User 1 and User 2 markers moving along a ride route, and passenger progress.
  Notes: Uses SSE endpoint /api/rides/live/:id. If EventSource unsupported, simulates locally.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

function initMap() {
  const map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  map.setView([0, 0], 2);
  return map;
}

function drawRoute(map, start, end) {
  return L.polyline([start, end], { color: '#22c55e', weight: 4 }).addTo(map);
}

function createMarker(map, label, color) {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};color:#001; padding:4px 6px; border-radius:6px; font-weight:700;">${label}</div>`,
    iconSize: [30, 18],
    iconAnchor: [15, 9],
  });
  return L.marker([0, 0], { icon }).addTo(map);
}

function updateStatus(pre, data) {
  pre.textContent = JSON.stringify(data, null, 2);
}

function startSse(rideId, onTick) {
  if (!('EventSource' in window)) return null;
  const es = new EventSource(`${API_BASE}/rides/live/${rideId}`);
  es.addEventListener('tick', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onTick(data);
    } catch (e) {
      console.error(e);
    }
  });
  es.onerror = (e) => {
    console.warn('SSE error; you may need to run the backend', e);
  };
  return es;
}

function startLocalSim(start, end, onTick) {
  let t = 0;
  const step = 0.02;
  function lerp(a, b, u) { return a + (b - a) * u; }
  function point(u) { return { lat: lerp(start.lat, end.lat, u), lng: lerp(start.lng, end.lng, u) }; }
  const timer = setInterval(() => {
    t += step;
    if (t > 1) t = 0;
    onTick({
      tick: Math.floor(t * 1000),
      t,
      route: { start, end, lengthKm: 0 },
      moving: { user1: point(t), user2: point(Math.max(0, t - 0.2)) },
      passengers: [],
    });
  }, 1000);
  return () => clearInterval(timer);
}

window.addEventListener('DOMContentLoaded', () => {
  const map = initMap();
  const rideIdInput = select('#rideId');
  const startBtn = select('#startBtn');
  const statusPre = select('#status');

  let routeLine = null;
  let user1Marker = createMarker(map, 'User 1', '#fbbf24');
  let user2Marker = createMarker(map, 'User 2', '#60a5fa');
  let passengerMarkers = [];
  let stopLocalSim = null;
  let es = null;

  function clearPassengers() {
    passengerMarkers.forEach((m) => map.removeLayer(m));
    passengerMarkers = [];
  }

  function handleTick(data) {
    updateStatus(statusPre, data);
    const { route, moving, passengers } = data;
    if (route && route.start && route.end) {
      if (routeLine) map.removeLayer(routeLine);
      routeLine = drawRoute(map, route.start, route.end);
      map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
    }
    if (moving?.user1) user1Marker.setLatLng([moving.user1.lat, moving.user1.lng]);
    if (moving?.user2) user2Marker.setLatLng([moving.user2.lat, moving.user2.lng]);

    clearPassengers();
    (passengers || []).forEach((p) => {
      const mk = createMarker(map, p.userId || 'P', '#34d399');
      mk.setLatLng([p.lat, p.lng]);
      passengerMarkers.push(mk);
    });
  }

  startBtn.addEventListener('click', async () => {
    const rideId = (rideIdInput.value || '').trim();
    if (!rideId) return alert('Enter a ride ID');

    // Stop previous
    if (es) es.close();
    if (stopLocalSim) stopLocalSim();

    // Try to get route once to initialize map if SSE fails
    try {
      const res = await fetch(`${API_BASE}/rides/${rideId}`);
      if (res.ok) {
        const ride = await res.json();
        if (ride.start && ride.end) {
          if (routeLine) map.removeLayer(routeLine);
          routeLine = drawRoute(map, ride.start, ride.end);
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
        }
      }
    } catch {}

    es = startSse(rideId, handleTick);
    if (!es) {
      // Fallback to local simple simulation if SSE unavailable
      const center = map.getCenter();
      const start = { lat: center.lat - 0.01, lng: center.lng - 0.01 };
      const end = { lat: center.lat + 0.01, lng: center.lng + 0.01 };
      stopLocalSim = startLocalSim(start, end, handleTick);
    }
  });
});
