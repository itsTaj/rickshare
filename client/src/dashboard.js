/*
  RickShare Dashboard (client/src/dashboard.js)
  Purpose: Display stored User ID, list ongoing rides, view history.
*/

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

window.addEventListener('DOMContentLoaded', () => {
  const userInfo = select('#userInfo');
  const ridesList = document.querySelector('#ridesList');
  const historyList = document.querySelector('#historyList');
  const refreshRidesBtn = document.querySelector('#refreshRidesBtn');
  const refreshHistoryBtn = document.querySelector('#refreshHistoryBtn');
  try {
    const raw = localStorage.getItem('rickshare_user');
    if (!raw) {
      userInfo.textContent = 'No user found. Please register or login.';
      return;
    }
    const user = JSON.parse(raw);
    userInfo.innerHTML = `
      <div><strong>User ID:</strong> ${user.id}</div>
      <div><strong>Email:</strong> ${user.email ?? '—'} | <strong>Phone:</strong> ${user.phone ?? '—'}</div>
      <div><strong>Name:</strong> ${(user.profile && user.profile.name) || '—'}</div>
    `;
  } catch (e) {
    userInfo.textContent = 'Error reading user data.';
  }

  // --- Quick Create Ride ---
  const startOut = document.querySelector('#dashStartOut');
  const endOut = document.querySelector('#dashEndOut');
  const fareInput = document.querySelector('#dashFare');
  const createBtn = document.querySelector('#dashCreateBtn');
  const rideIdOut = document.querySelector('#dashRideIdOut');
  const qrDiv = document.querySelector('#dashCreateQR');

  let createMap, createStart, createEnd, createStartMarker, createEndMarker, createLine;
  if (document.querySelector('#dashCreateMap')) {
    createMap = L.map('dashCreateMap');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(createMap);
    createMap.setView([0,0], 2);
    createMap.on('click', (e) => {
      if (!createStart) {
        createStart = e.latlng;
        if (createStartMarker) createMap.removeLayer(createStartMarker);
        createStartMarker = L.marker(createStart, { title: 'Start' }).addTo(createMap);
        startOut.textContent = `${createStart.lat.toFixed(5)}, ${createStart.lng.toFixed(5)}`;
      } else if (!createEnd) {
        createEnd = e.latlng;
        if (createEndMarker) createMap.removeLayer(createEndMarker);
        createEndMarker = L.marker(createEnd, { title: 'End' }).addTo(createMap);
        endOut.textContent = `${createEnd.lat.toFixed(5)}, ${createEnd.lng.toFixed(5)}`;
        if (createLine) createMap.removeLayer(createLine);
        createLine = L.polyline([createStart, createEnd], { color: '#22c55e', weight: 4 }).addTo(createMap);
        createMap.fitBounds(createLine.getBounds(), { padding: [20,20] });
      } else {
        // reset
        if (createStartMarker) createMap.removeLayer(createStartMarker);
        if (createEndMarker) createMap.removeLayer(createEndMarker);
        if (createLine) createMap.removeLayer(createLine);
        createStart = e.latlng;
        createEnd = null;
        createStartMarker = L.marker(createStart, { title: 'Start' }).addTo(createMap);
        startOut.textContent = `${createStart.lat.toFixed(5)}, ${createStart.lng.toFixed(5)}`;
        endOut.textContent = 'not set';
      }
    });
  }

  createBtn?.addEventListener('click', async () => {
    const raw = localStorage.getItem('rickshare_user');
    const user = raw ? JSON.parse(raw) : { id: 'anonymous' };
    if (!createStart || !createEnd) return alert('Choose start and end on map');
    const fare = Number((fareInput?.value || '').trim());
    if (!Number.isFinite(fare) || fare <= 0) return alert('Enter fare');
    try {
      const res = await fetch('http://localhost:4000/api/rides/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, start: { lat: createStart.lat, lng: createStart.lng }, end: { lat: createEnd.lat, lng: createEnd.lng }, fare })
      });
      if (!res.ok) throw new Error('create failed');
      const ride = await res.json();
      rideIdOut.textContent = ride.id;
      qrDiv.innerHTML = '';
      // eslint-disable-next-line no-new
      new QRCode(qrDiv, { text: `rickshare:ride:${ride.id}`, width: 120, height: 120 });
      alert(`Ride created: ${ride.id}`);
      await loadRides();
    } catch (e) {
      alert('Failed to create ride');
    }
  });

  // --- Quick Join Ride ---
  const joinMapEl = document.querySelector('#dashJoinMap');
  const joinStartOut = document.querySelector('#dashJoinStartOut');
  const joinEndOut = document.querySelector('#dashJoinEndOut');
  const joinRideIdInput = document.querySelector('#dashRideId');
  const joinScanBtn = document.querySelector('#dashScanBtn');
  const joinBtn = document.querySelector('#dashJoinBtn');
  let joinMap, joinStart, joinEnd, joinStartMarker, joinEndMarker, joinLine;
  if (joinMapEl) {
    joinMap = L.map('dashJoinMap');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(joinMap);
    joinMap.setView([0,0], 2);
    joinMap.on('click', (e) => {
      if (!joinStart) {
        joinStart = e.latlng;
        if (joinStartMarker) joinMap.removeLayer(joinStartMarker);
        joinStartMarker = L.marker(joinStart, { title: 'Join Start' }).addTo(joinMap);
        joinStartOut.textContent = `${joinStart.lat.toFixed(5)}, ${joinStart.lng.toFixed(5)}`;
      } else if (!joinEnd) {
        joinEnd = e.latlng;
        if (joinEndMarker) joinMap.removeLayer(joinEndMarker);
        joinEndMarker = L.marker(joinEnd, { title: 'Join End' }).addTo(joinMap);
        joinEndOut.textContent = `${joinEnd.lat.toFixed(5)}, ${joinEnd.lng.toFixed(5)}`;
        if (joinLine) joinMap.removeLayer(joinLine);
        joinLine = L.polyline([joinStart, joinEnd], { color: '#60a5fa', dashArray: '6 6' }).addTo(joinMap);
        joinMap.fitBounds(joinLine.getBounds(), { padding: [20,20] });
      } else {
        if (joinStartMarker) joinMap.removeLayer(joinStartMarker);
        if (joinEndMarker) joinMap.removeLayer(joinEndMarker);
        if (joinLine) joinMap.removeLayer(joinLine);
        joinStart = e.latlng;
        joinEnd = null;
        joinStartMarker = L.marker(joinStart, { title: 'Join Start' }).addTo(joinMap);
        joinStartOut.textContent = `${joinStart.lat.toFixed(5)}, ${joinStart.lng.toFixed(5)}`;
        joinEndOut.textContent = 'not set';
      }
    });
  }

  joinScanBtn?.addEventListener('click', () => {
    const mocked = prompt('Enter Ride ID (mock QR scanner)');
    if (mocked) joinRideIdInput.value = mocked;
  });

  joinBtn?.addEventListener('click', async () => {
    const raw = localStorage.getItem('rickshare_user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return alert('Login or register first');
    const rideId = (joinRideIdInput?.value || '').trim();
    if (!rideId) return alert('Enter ride ID');
    if (!joinStart || !joinEnd) return alert('Choose join start and end on map');
    try {
      const res = await fetch('http://localhost:4000/api/rides/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, userId: user.id, joinStart: { lat: joinStart.lat, lng: joinStart.lng }, joinEnd: { lat: joinEnd.lat, lng: joinEnd.lng } })
      });
      if (!res.ok) throw new Error('join failed');
      const data = await res.json();
      alert(`Joined ride ${data.rideId}. Estimated share: ${data.estimatedShare}`);
      await loadRides();
    } catch (e) {
      alert('Failed to join ride');
    }
  });

  async function loadRides() {
    try {
      const res = await fetch('http://localhost:4000/api/rides');
      const rides = await res.json();
      ridesList.innerHTML = '';
      rides
        .filter((r) => r.status !== 'completed')
        .forEach((r) => {
          const div = document.createElement('div');
          div.style.padding = '8px';
          div.style.border = '1px solid #1f2937';
          div.style.borderRadius = '8px';
          div.style.marginBottom = '6px';
          const start = r.start || r.pickup;
          const end = r.end || r.destination;
          div.innerHTML = `
            <div><strong>Ride ID:</strong> ${r.id}</div>
            <div>Status: ${r.status}</div>
            <div>From: ${start ? start.lat.toFixed(3)+','+start.lng.toFixed(3) : '—'} → To: ${end ? end.lat.toFixed(3)+','+end.lng.toFixed(3) : '—'}</div>
            <div>Fare: ${r.fare ?? '—'}</div>
            <div style="margin-top:6px;">
              <a href="./live.html" style="color:#fff;margin-right:8px;">Live</a>
              <a href="./index.html" style="color:#fff;margin-right:8px;">Create Ride</a>
              <a href="./join.html" style="color:#fff;">Join Ride</a>
            </div>
          `;
          ridesList.appendChild(div);
        });
    } catch (e) {
      ridesList.textContent = 'Failed to load rides.';
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch('http://localhost:4000/api/rides/history');
      const items = await res.json();
      historyList.innerHTML = '';
      items.slice().reverse().forEach((h) => {
        const div = document.createElement('div');
        div.style.padding = '8px';
        div.style.border = '1px solid #1f2937';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '6px';
        div.innerHTML = `
          <div><strong>Ride:</strong> ${h.rideId}</div>
          <div>Completed: ${h.completedAt}</div>
          <div>Base Fare: ${h.baseFare} • Route: ${h.routeKm} km</div>
          <div>Participants: ${Array.isArray(h.participants) ? h.participants.join(', ') : ''}</div>
        `;
        historyList.appendChild(div);
      });
    } catch (e) {
      historyList.textContent = 'Failed to load history.';
    }
  }

  refreshRidesBtn?.addEventListener('click', loadRides);
  refreshHistoryBtn?.addEventListener('click', loadHistory);
  loadRides();
  loadHistory();
});
