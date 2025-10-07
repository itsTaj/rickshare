/*
  RickShare Login (client/src/login.js)
  Purpose: Authenticate via email/phone + password/OTP (mock) and redirect to dashboard.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

async function login(identifier, secret) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: secret }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const idInput = select('#identifier');
  const secretInput = select('#secret');
  const loginBtn = select('#loginBtn');

  loginBtn.addEventListener('click', async () => {
    const identifier = (idInput.value || '').trim();
    const secret = (secretInput.value || '').trim();
    if (!identifier) return alert('Enter email or phone');
    try {
      const { user } = await login(identifier, secret);
      localStorage.setItem('rickshare_user', JSON.stringify(user));
      window.location.href = './dashboard.html';
    } catch (e) {
      console.error(e);
      alert('Login failed');
    }
  });
});
