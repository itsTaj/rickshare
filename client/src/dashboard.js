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
