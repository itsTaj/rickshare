/*
  RickShare Registration Script (client/src/register.js)
  Purpose: Handle mocked OTP registration, profile save, and wallet linking flows.
*/

const API_BASE = 'http://localhost:4000/api';

function select(id) {
  const el = document.querySelector(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

let currentUserId = null;

async function register(email) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: 'mock' }),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  return res.json();
}

async function saveProfile(userId, profile) {
  const res = await fetch(`${API_BASE}/profile/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`Save profile failed: ${res.status}`);
  return res.json();
}

async function linkWallet(userId, wallet) {
  const res = await fetch(`${API_BASE}/link-wallet/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wallet),
  });
  if (!res.ok) throw new Error(`Link wallet failed: ${res.status}`);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const emailInput = select('#email');
  const otpInput = select('#otp');
  const sendOtpBtn = select('#sendOtpBtn');
  const verifyOtpBtn = select('#verifyOtpBtn');
  const userIdOut = select('#userIdOut');

  const nameInput = select('#name');
  const photoUrlInput = select('#photoUrl');
  const emergencyInput = select('#emergencyContact');
  const saveProfileBtn = select('#saveProfileBtn');

  const providerSelect = select('#provider');
  const accountInput = select('#account');
  const linkWalletBtn = select('#linkWalletBtn');

  sendOtpBtn.addEventListener('click', () => {
    // Mock: pretend OTP was sent
    alert(`OTP sent to ${emailInput.value || 'your email'} (mock)`);
  });

  verifyOtpBtn.addEventListener('click', async () => {
    const email = (emailInput.value || '').trim();
    const otp = (otpInput.value || '').trim();
    if (!email) {
      alert('Enter email');
      return;
    }
    if (!otp) {
      alert('Enter OTP (mock any value)');
      return;
    }
    try {
      const user = await register(email);
      currentUserId = user.id;
      userIdOut.textContent = `user: ${user.id}`;
      alert('Registered! Proceed to create profile.');
    } catch (e) {
      console.error(e);
      alert('Registration failed');
    }
  });

  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUserId) {
      alert('Register first');
      return;
    }
    const profile = {
      name: (nameInput.value || '').trim(),
      photoUrl: (photoUrlInput.value || '').trim(),
      emergencyContact: (emergencyInput.value || '').trim(),
    };
    if (!profile.name) {
      alert('Enter your name');
      return;
    }
    try {
      const updated = await saveProfile(currentUserId, profile);
      alert('Profile saved');
    } catch (e) {
      console.error(e);
      alert('Failed to save profile');
    }
  });

  linkWalletBtn.addEventListener('click', async () => {
    if (!currentUserId) {
      alert('Register first');
      return;
    }
    const provider = providerSelect.value;
    const account = (accountInput.value || '').trim();
    if (!account) {
      alert('Enter account number');
      return;
    }
    try {
      await linkWallet(currentUserId, { provider, account });
      alert('Wallet linked');
    } catch (e) {
      console.error(e);
      alert('Failed to link wallet');
    }
  });
});
