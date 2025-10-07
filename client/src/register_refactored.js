/*
  RickShare Registration (client/src/register_refactored.js)
  Purpose: Dedicated registration flow with name + email/phone + password/OTP (mock), then redirect to dashboard.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

async function register(payload) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const nameInput = select('#name');
  const emailInput = select('#email');
  const phoneInput = select('#phone');
  const passwordInput = select('#password');
  const registerBtn = select('#registerBtn');

  registerBtn.addEventListener('click', async () => {
    const name = (nameInput.value || '').trim();
    const email = (emailInput.value || '').trim();
    const phone = (phoneInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    if (!email && !phone) return alert('Enter email or phone');

    try {
      const user = await register({ name, email: email || undefined, phone: phone || undefined, password: password || undefined });
      localStorage.setItem('rickshare_user', JSON.stringify(user));
      // Surface the generated persistent ID to the user for the test
      alert(`Registered. Your User ID is ${user.id}`);
      window.location.href = './dashboard.html';
    } catch (e) {
      console.error(e);
      alert('Registration failed');
    }
  });
});
