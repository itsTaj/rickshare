/*
  RickShare Client Script (client/src/main.js)
  Purpose: Initialize Leaflet map, wire up simple demo ride creation,
           and render a QR code placeholder via qrcode.js.
  Notes:
    - Backend API base is http://localhost:4000/api by default.
    - Click map to set pickup; Alt/Option+Click to set destination.
*/

const API_BASE = 'http://localhost:4000/api';

function formatLatLng(latlng) {
  return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function select(el) {
  const element = document.querySelector(el);
  if (!element) throw new Error(`Missing required element: ${el}`);
  return element;
}

function renderQrForRideId(rideId) {
  const qrContainer = select('#qr');
  qrContainer.innerHTML = '';
  // QR payload: could be a deep link or plain ID
  const qrPayload = `rickshare:ride:${rideId}`;
  // qrcode.js global QRCode available from CDN
  // eslint-disable-next-line no-new
  new QRCode(qrContainer, {
    text: qrPayload,
    width: 160,
    height: 160,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });
}

async function createRide(payload) {
  const response = await fetch(`${API_BASE}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create ride failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

function initMap() {
  // Default center (0,0) until geolocation resolves
  const map = L.map('map');

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  map.setView([0, 0], 2);

  // Try to locate the user immediately
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 14);
      },
      () => {
        // Ignore errors; user can click Locate button
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return map;
}

function wireUi(map) {
  const locateBtn = select('#locateBtn');
  const clearMarkersBtn = select('#clearMarkersBtn');
  const rideForm = select('#rideForm');
  const pickupOutput = select('#pickupOutput');
  const destinationOutput = select('#destinationOutput');

  let pickupMarker = null;
  let destinationMarker = null;

  function setPickup(latlng) {
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker(latlng, { title: 'Pickup' }).addTo(map);
    pickupOutput.textContent = formatLatLng(latlng);
  }

  function setDestination(latlng) {
    if (destinationMarker) map.removeLayer(destinationMarker);
    destinationMarker = L.marker(latlng, { title: 'Destination' }).addTo(map);
    destinationOutput.textContent = formatLatLng(latlng);
  }

  map.on('click', (e) => {
    if (e.originalEvent.altKey || e.originalEvent.metaKey) {
      setDestination(e.latlng);
    } else {
      setPickup(e.latlng);
    }
  });

  locateBtn.addEventListener('click', () => {
    map.locate({ setView: true, maxZoom: 16 });
  });

  clearMarkersBtn.addEventListener('click', () => {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (destinationMarker) map.removeLayer(destinationMarker);
    pickupMarker = null;
    destinationMarker = null;
    pickupOutput.textContent = 'not set';
    destinationOutput.textContent = 'not set';
  });

  rideForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    const riderName = select('#riderName').value.trim() || 'Guest';
    const pickup = pickupMarker ? pickupMarker.getLatLng() : null;
    const destination = destinationMarker ? destinationMarker.getLatLng() : null;

    if (!pickup) {
      alert('Please select a pickup point on the map.');
      return;
    }

    try {
      // Minimal payload for demo
      const payload = {
        riderName,
        pickup: pickup ? { lat: pickup.lat, lng: pickup.lng } : null,
        destination: destination ? { lat: destination.lat, lng: destination.lng } : null,
      };

      const created = await createRide(payload);
      renderQrForRideId(created.id);
      alert(`Ride created with ID ${created.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create ride. Is the backend running on :4000?');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const map = initMap();
  wireUi(map);
});
