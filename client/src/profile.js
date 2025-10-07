/*
  RickShare Profile (client/src/profile.js)
  Purpose: Edit account and profile details; persist to backend mock.json.
*/

const API_BASE = 'http://localhost:4000/api';

function select(q) {
  const el = document.querySelector(q);
  if (!el) throw new Error(`Missing element ${q}`);
  return el;
}

function getCurrentUser() {
  const raw = localStorage.getItem('rickshare_user');
  return raw ? JSON.parse(raw) : null;
}

async function fetchProfile(userId) {
  const res = await fetch(`${API_BASE}/profile/${userId}`);
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

async function saveProfile(userId, payload) {
  const res = await fetch(`${API_BASE}/profile/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save');
  return res.json();
}

async function linkWallet(userId, provider, account) {
  const res = await fetch(`${API_BASE}/link-wallet/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, account }),
  });
  if (!res.ok) throw new Error('Failed to link wallet');
  return res.json();
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  const user = getCurrentUser();
  const userIdRow = select('#userIdRow');
  if (!user) {
    userIdRow.textContent = 'No user found. Please login or register.';
    return;
  }
  userIdRow.textContent = `User: ${user.id}`;

  const nameInput = select('#name');
  const emailInput = select('#email');
  const phoneInput = select('#phone');
  const saveAccountBtn = select('#saveAccountBtn');

  const avatarImg = select('#avatar');
  const photoInput = select('#photoInput');
  const savePhotoBtn = select('#savePhotoBtn');

  const contactInput = select('#contactInput');
  const addContactBtn = select('#addContactBtn');
  const contactsDiv = select('#contacts');
  const saveContactsBtn = select('#saveContactsBtn');

  const providerSel = select('#provider');
  const accountInput = select('#account');
  const linkWalletBtn = select('#linkWalletBtn');
  const walletsDiv = select('#wallets');

  let currentProfile = null;

  function renderContacts(list) {
    contactsDiv.innerHTML = '';
    (list || []).forEach((c) => {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = c;
      contactsDiv.appendChild(span);
    });
  }

  function renderWallets(list) {
    walletsDiv.innerHTML = '';
    (list || []).forEach((w) => {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = `${w.provider}: ${w.account}`;
      walletsDiv.appendChild(span);
    });
  }

  // Load profile
  try {
    const data = await fetchProfile(user.id);
    nameInput.value = (data.profile && data.profile.name) || '';
    emailInput.value = data.email || '';
    phoneInput.value = data.phone || '';
    avatarImg.src = (data.profile && data.profile.photoUrl) || '';
    currentProfile = data.profile || {};
    renderContacts(currentProfile.emergencyContacts || []);
    renderWallets(data.wallets || []);
  } catch (e) {
    // ignore
  }

  saveAccountBtn.addEventListener('click', async () => {
    try {
      const updated = await saveProfile(user.id, {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
      });
      localStorage.setItem('rickshare_user', JSON.stringify(updated));
      alert('Account saved');
    } catch (e) {
      alert('Failed to save account');
    }
  });

  savePhotoBtn.addEventListener('click', async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return alert('Choose a file first');
    const dataUrl = await toDataUrl(file);
    try {
      const updated = await saveProfile(user.id, { photoUrl: dataUrl });
      localStorage.setItem('rickshare_user', JSON.stringify(updated));
      avatarImg.src = dataUrl;
      alert('Photo saved');
    } catch (e) {
      alert('Failed to save photo');
    }
  });

  addContactBtn.addEventListener('click', () => {
    const value = (contactInput.value || '').trim();
    if (!value) return;
    const list = (currentProfile && currentProfile.emergencyContacts) ? [...currentProfile.emergencyContacts] : [];
    list.push(value);
    currentProfile = { ...(currentProfile || {}), emergencyContacts: list };
    renderContacts(list);
    contactInput.value = '';
  });

  saveContactsBtn.addEventListener('click', async () => {
    try {
      const list = (currentProfile && currentProfile.emergencyContacts) || [];
      const updated = await saveProfile(user.id, { emergencyContacts: list });
      localStorage.setItem('rickshare_user', JSON.stringify(updated));
      alert('Contacts saved');
    } catch (e) {
      alert('Failed to save contacts');
    }
  });

  linkWalletBtn.addEventListener('click', async () => {
    const provider = providerSel.value;
    const account = (accountInput.value || '').trim();
    if (!account) return alert('Enter account');
    try {
      const updated = await linkWallet(user.id, provider, account);
      localStorage.setItem('rickshare_user', JSON.stringify(updated));
      renderWallets(updated.wallets || []);
      alert('Wallet linked');
    } catch (e) {
      alert('Failed to link wallet');
    }
  });
});
