/*
  RickShare Completion (client/src/complete.js)
  Purpose: Load a ride, display computed fare breakdown, and confirm payments (mock) via /api/rides/complete.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

function renderSummary(el, summary) {
  el.innerHTML = `
    <div><strong>Ride</strong>: ${summary.rideId}</div>
    <div><strong>Owner</strong>: ${summary.ownerUserId ?? 'N/A'}</div>
    <div><strong>Base Fare</strong>: ${summary.baseFare}</div>
    <div><strong>Route</strong>: ${summary.routeKm} km</div>
    <div><strong>Participants</strong>: ${summary.participants.join(', ')}</div>
    <div><strong>Completed</strong>: ${summary.completedAt}</div>
  `;
}

function renderBreakdown(tbody, breakdown) {
  tbody.innerHTML = '';
  breakdown.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.userId}</td>
      <td>${b.amount}</td>
      <td>
        <select data-user="${b.userId}">
          <option value="wallet">Wallet</option>
          <option value="cash">Cash</option>
        </select>
      </td>
      <td><input type="checkbox" data-user="${b.userId}" /></td>
    `;
    tbody.appendChild(tr);
  });
}

async function completeRide(rideId, payments) {
  const res = await fetch(`${API_BASE}/rides/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId, payments }),
  });
  if (!res.ok) throw new Error(`Complete failed: ${res.status}`);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const rideIdInput = select('#rideId');
  const loadBtn = select('#loadBtn');
  const completeBtn = select('#completeBtn');
  const summaryDiv = select('#summary');
  const breakdownTbody = select('#breakdown');

  let lastSummary = null;

  loadBtn.addEventListener('click', async () => {
    const rideId = (rideIdInput.value || '').trim();
    if (!rideId) return alert('Enter ride ID');

    try {
      // Trigger backend completion calculation without confirming payments
      const { summary } = await completeRide(rideId, []);
      lastSummary = summary;
      renderSummary(summaryDiv, summary);
      renderBreakdown(breakdownTbody, summary.breakdown || []);
      alert('Loaded fare breakdown. You can now confirm payments.');
    } catch (e) {
      console.error(e);
      alert('Failed to load breakdown');
    }
  });

  completeBtn.addEventListener('click', async () => {
    const rideId = (rideIdInput.value || '').trim();
    if (!rideId) return alert('Enter ride ID');
    if (!lastSummary || !Array.isArray(lastSummary.breakdown)) {
      return alert('Load the breakdown first');
    }

    const payments = lastSummary.breakdown.map((b) => {
      const methodSel = document.querySelector(`select[data-user="${b.userId}"]`);
      const checkbox = document.querySelector(`input[type="checkbox"][data-user="${b.userId}"]`);
      return {
        userId: b.userId,
        method: methodSel ? methodSel.value : 'wallet',
        amount: b.amount,
        confirmed: checkbox ? checkbox.checked : false,
      };
    });

    try {
      const result = await completeRide(rideId, payments);
      lastSummary = result.summary;
      renderSummary(summaryDiv, result.summary);
      renderBreakdown(breakdownTbody, result.summary.breakdown || []);
      alert('Payments confirmed (mock) and ride archived');
    } catch (e) {
      console.error(e);
      alert('Failed to complete ride');
    }
  });
});
