/*
  RickShare Join Script (client/src/join.js)
  Purpose: Show nearby rides, visualize overlap and estimate fare, and join via mocked QR or manual selection.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

function formatLatLng(latlng) {
  return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function drawRouteOverlay(map, start, end) {
  return L.polyline([start, end], { color: '#22c55e', weight: 4 }).addTo(map);
}

async function fetchNearby({ lat, lng, radiusKm }) {
  const params = new URLSearchParams({ lat, lng, radiusKm });
  const res = await fetch(`${API_BASE}/rides/nearby?${params.toString()}`);
  if (!res.ok) throw new Error(`Nearby failed: ${res.status}`);
  return res.json();
}

async function joinRide(payload) {
  const res = await fetch(`${API_BASE}/rides/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Join failed: ${res.status}`);
  return res.json();
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

window.addEventListener('DOMContentLoaded', () => {
  const map = initMap();
  const locateBtn = select('#locateBtn');
  const clearBtn = select('#clearBtn');
  const list = select('#list');
  const userIdInput = select('#userId');
  const radiusInput = select('#radius');
  const refreshBtn = select('#refreshBtn');
  const scanBtn = select('#scanBtn');

  let userLocation = null;
  let overlays = [];
  let joinStartMarker = null;
  let joinEndMarker = null;
  let joinLine = null;

  function clearOverlays() {
    overlays.forEach((o) => map.removeLayer(o));
    overlays = [];
    if (joinStartMarker) map.removeLayer(joinStartMarker);
    if (joinEndMarker) map.removeLayer(joinEndMarker);
    if (joinLine) map.removeLayer(joinLine);
    joinStartMarker = null;
    joinEndMarker = null;
    joinLine = null;
  }

  map.on('click', (e) => {
    // Click to pick join segment: first click = start, second = end
    if (!joinStartMarker) {
      joinStartMarker = L.marker(e.latlng, { title: 'Join Start' }).addTo(map);
    } else if (!joinEndMarker) {
      joinEndMarker = L.marker(e.latlng, { title: 'Join End' }).addTo(map);
      joinLine = L.polyline([joinStartMarker.getLatLng(), joinEndMarker.getLatLng()], { color: '#60a5fa', dashArray: '6 6' }).addTo(map);
    } else {
      // Reset
      if (joinStartMarker) map.removeLayer(joinStartMarker);
      if (joinEndMarker) map.removeLayer(joinEndMarker);
      if (joinLine) map.removeLayer(joinLine);
      joinStartMarker = L.marker(e.latlng, { title: 'Join Start' }).addTo(map);
      joinEndMarker = null;
      joinLine = null;
    }
  });

  locateBtn.addEventListener('click', () => {
    map.locate({ setView: true, maxZoom: 16 });
  });

  clearBtn.addEventListener('click', clearOverlays);

  refreshBtn.addEventListener('click', async () => {
    if (!userLocation) {
      alert('Move/locate the map to your position first.');
      return;
    }
    clearOverlays();
    try {
      const radiusKm = Number(radiusInput.value) || 3;
      const rides = await fetchNearby({ lat: userLocation.lat, lng: userLocation.lng, radiusKm });
      list.innerHTML = '';
      rides.forEach((r) => {
        const marker = L.marker(r.start).addTo(map).bindPopup(`Ride ${r.id}<br/>Fare: ${r.fare ?? 'N/A'}<br/>Dist: ${r.distanceKm.toFixed(2)} km`);
        overlays.push(marker);
        const item = document.createElement('div');
        item.className = 'ride-item';
        item.innerHTML = `
          <div><strong>Ride</strong>: ${r.id}</div>
          <div class="small">Start: ${formatLatLng(r.start)} | End: ${formatLatLng(r.end)}</div>
          <div class="small">Fare: ${r.fare ?? 'N/A'} | Start distance: ${r.distanceKm.toFixed(2)} km</div>
          <div class="row"><button data-ride-id="${r.id}">Join this ride</button></div>
        `;
        item.querySelector('button').addEventListener('click', async () => {
          const userId = (userIdInput.value || '').trim();
          if (!userId) return alert('Enter your User ID');
          if (!joinStartMarker || !joinEndMarker) return alert('Click the map to set your join start and end');
          const joinStart = joinStartMarker.getLatLng();
          const joinEnd = joinEndMarker.getLatLng();
          try {
            const result = await joinRide({
              rideId: r.id,
              userId,
              joinStart: { lat: joinStart.lat, lng: joinStart.lng },
              joinEnd: { lat: joinEnd.lat, lng: joinEnd.lng },
            });
            alert(`Joined! Estimated share: ${result.estimatedShare}`);
            // Visualize the ride route
            const poly = drawRouteOverlay(map, r.start, r.end);
            overlays.push(poly);
          } catch (e) {
            console.error(e);
            alert('Join failed');
          }
        });
        list.appendChild(item);
      });
    } catch (e) {
      console.error(e);
      alert('Failed to load nearby rides');
    }
  });

  scanBtn.addEventListener('click', async () => {
    const mocked = prompt('Enter Ride ID (mocked QR scanner)');
    if (!mocked) return;
    // You could fetch ride by ID and center the map
    try {
      const res = await fetch(`${API_BASE}/rides/${mocked}`);
      if (!res.ok) return alert('Ride not found');
      const ride = await res.json();
      clearOverlays();
      const marker = L.marker(ride.start || ride.pickup).addTo(map).bindPopup(`Ride ${ride.id}`);
      overlays.push(marker);
      if (ride.start && ride.end) overlays.push(drawRouteOverlay(map, ride.start, ride.end));
      if (ride.pickup && ride.destination) overlays.push(drawRouteOverlay(map, ride.pickup, ride.destination));
      const center = ride.start || ride.pickup;
      if (center) map.setView([center.lat, center.lng], 14);
    } catch (e) {
      console.error(e);
      alert('Failed to load ride');
    }
  });

  // Try to set location from geolocation or map move as fallback
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation = { lat: latitude, lng: longitude };
        map.setView([latitude, longitude], 14);
      },
      () => {
        // fallback to map center
        userLocation = map.getCenter();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  map.on('moveend', () => {
    const c = map.getCenter();
    userLocation = { lat: c.lat, lng: c.lng };
  });
});
