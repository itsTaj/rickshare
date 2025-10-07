/*
  RickShare Safety (client/src/safety.js)
  Purpose: SOS (mock), post-ride feedback, and live share link.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

async function postFeedback(entry) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`Feedback failed: ${res.status}`);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const sosBtn = select('#sosBtn');
  const sosStatus = select('#sosStatus');

  const rideIdInput = select('#rideId');
  const userIdInput = select('#userId');
  const targetUserIdInput = select('#targetUserId');
  const ratingSel = select('#rating');
  const commentInput = select('#comment');
  const submitFeedbackBtn = select('#submitFeedbackBtn');
  const shareLinkInput = select('#shareLink');

  // Mock share link: to live.html with rideId query
  function updateShareLink() {
    const rideId = (rideIdInput.value || '').trim();
    const url = new URL(window.location.origin + window.location.pathname);
    // Link to live tracking page at same origin
    const live = `${window.location.origin}${window.location.pathname.replace('safety.html', 'live.html')}?rideId=${encodeURIComponent(rideId)}`;
    shareLinkInput.value = live;
  }

  rideIdInput.addEventListener('input', updateShareLink);
  updateShareLink();

  sosBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          sosStatus.textContent = `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          alert(`SOS sent with location ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (mock)`);
        },
        () => {
          alert('SOS sent (location unavailable) (mock)');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('SOS sent (geolocation unsupported) (mock)');
    }
  });

  submitFeedbackBtn.addEventListener('click', async () => {
    const rideId = (rideIdInput.value || '').trim();
    const userId = (userIdInput.value || '').trim();
    const rating = Number(ratingSel.value);
    const comment = (commentInput.value || '').trim();
    const targetUserId = (targetUserIdInput.value || '').trim() || undefined;

    if (!rideId || !userId) {
      alert('Enter ride ID and your user ID');
      return;
    }

    try {
      await postFeedback({ rideId, userId, rating, comment, targetUserId });
      alert('Feedback submitted');
      commentInput.value = '';
    } catch (e) {
      console.error(e);
      alert('Failed to submit feedback');
    }
  });
});
