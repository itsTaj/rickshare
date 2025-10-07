/*
  RickShare Dashboard (client/src/dashboard.js)
  Purpose: Display stored User ID and quick links to flows.
*/

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

window.addEventListener('DOMContentLoaded', () => {
  const userInfo = select('#userInfo');
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
});
