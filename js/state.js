/* ===================== الحالة العامة — الخادم هو مصدر الحقيقة ===================== */
const STATE_API_URL = '/api/state';
const telegramWebApp = window.Telegram?.WebApp || null;
const hasTelegramSession = Boolean(telegramWebApp?.initData);
const hasStateApi = window.location.protocol !== 'file:' && hasTelegramSession;
const DEVICE_STORAGE_KEY = 'six-houses-device-id';

function showTelegramOnlyGate() {
  const gate = document.getElementById('telegramOnlyGate');
  if (gate) gate.hidden = false;
}

function getTelegramInitData() {
  return String(window.Telegram?.WebApp?.initData || '');
}

function requireTelegramInitData() {
  const initData = getTelegramInitData();
  if (!initData) throw new Error('افتح التطبيق من داخل Telegram فقط');
  return initData;
}

function getDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (_) {
    return '';
  }
}

function idempotencyKey() {
  return crypto.randomUUID();
}

if (hasTelegramSession) {
  telegramWebApp.ready();
  telegramWebApp.expand();
} else {
  showTelegramOnlyGate();
}

const State = {
  telegramUserId: '',
  clientId: '',
  balance: 0,
  reservedBalance: 0,
  progress: { referrals: 0, ads: 0, deposit: 0 },
  unlockedHouses: [1],
  activeHouseId: 1,
  tonAddress: '',
  collectibles: [],
  config: { minWithdrawal: 0.01, maxActiveCoins: 10 },
  serverConnected: false,
  syncing: false,
};

let stateHydrating = false;
let refreshTimer = null;
let renderedHouseSignature = '';


function applyServerState(data) {
  if (!data) return;
  State.telegramUserId = String(data.telegramUserId || '');
  State.clientId = State.telegramUserId;
  State.balance = Number(data.balance) || 0;
  State.reservedBalance = Number(data.reservedBalance) || 0;
  State.progress = data.progress || { referrals: 0, ads: 0, deposit: 0 };
  const nextUnlockedHouses = Array.isArray(data.unlockedHouses) ? data.unlockedHouses : [1];
  State.unlockedHouses = nextUnlockedHouses;
  // The server does not persist the selected house; keep the local selection.
  State.tonAddress = data.tonAddress || '';
  State.collectibles = Array.isArray(data.collectibles) ? data.collectibles : [];
  State.config = data.config || State.config;
  State.serverConnected = true;
  renderBalance();
  if (typeof renderServerCoins === 'function') renderServerCoins(State.collectibles);
  const houseSignature = `${State.activeHouseId}|${State.unlockedHouses.join(',')}`;
  if (typeof renderBoxes === 'function' && houseSignature !== renderedHouseSignature) {
    renderBoxes();
    renderedHouseSignature = houseSignature;
  }
  if (typeof renderWalletProgress === 'function') renderWalletProgress();
}

function clearServerState() {
  State.balance = 0;
  State.reservedBalance = 0;
  State.progress = { referrals: 0, ads: 0, deposit: 0 };
  State.unlockedHouses = [1];
  State.tonAddress = '';
  State.collectibles = [];
  State.serverConnected = false;
  if (typeof renderServerCoins === 'function') renderServerCoins([]);
}

async function apiRequest(path, method = 'GET', body = null, idempotency = '') {
  if (!hasStateApi) throw new Error('State API is unavailable');
  const headers = {
    'X-Telegram-Init-Data': requireTelegramInitData(),
    'X-Device-ID': getDeviceId(),
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (idempotency) headers['Idempotency-Key'] = idempotency;
  const response = await fetch(path, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data?.error || `API returned ${response.status}`);
  return data;
}

async function loadStateFromServer() {
  if (!hasStateApi) {
    clearServerState();
    return false;
  }
  try {
    stateHydrating = true;
    applyServerState(await apiRequest(STATE_API_URL));
    return true;
  } catch (error) {
    clearServerState();
    renderBalance();
    console.error('Server state unavailable; local balance is disabled.', error);
    if (typeof showToast === 'function') showToast('قاعدة البيانات غير متاحة');
    return false;
  } finally {
    stateHydrating = false;
  }
}

async function syncStateToServer() {
  if (!hasStateApi || !State.serverConnected || State.syncing) return;
  State.syncing = true;
  try {
    applyServerState(await apiRequest(STATE_API_URL, 'POST', { tonAddress: State.tonAddress || null }));
  } catch (error) {
    State.serverConnected = false;
    console.error('Server state update failed.', error);
  } finally {
    State.syncing = false;
  }
}

function saveState() {
  if (stateHydrating || !State.serverConnected) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => syncStateToServer(), 200);
}

async function refreshStateFromServer() {
  if (!hasStateApi || State.syncing) return;
  try {
    applyServerState(await apiRequest(STATE_API_URL));
  } catch (error) {
    State.serverConnected = false;
    console.error('Server refresh failed.', error);
  }
}

function collectCoinFromServer(coinId) {
  return (async () => {
    if (!hasStateApi || !State.serverConnected) return false;
    try {
      applyServerState(await apiRequest(
        '/api/collect',
        'POST',
        { coinId: String(coinId) },
        idempotencyKey()
      ));
      return true;
    } catch (error) {
      console.error('Coin collection rejected by server.', error);
      if (typeof showToast === 'function') showToast(error.message || 'تعذر جمع العملة');
      await refreshStateFromServer();
      return false;
    }
  })();
}

async function startAdSession() {
  return apiRequest('/api/ads/start', 'POST', {});
}

async function completeAdSession(sessionId) {
  applyServerState(await apiRequest(
    '/api/ads/complete',
    'POST',
    { sessionId: String(sessionId) },
    idempotencyKey()
  ));
  return true;
}

async function requestWithdrawal() {
  const result = await apiRequest('/api/withdrawals', 'POST', {}, idempotencyKey());
  await refreshStateFromServer();
  return result;
}

function requestServerRefresh() {
  if (!State.serverConnected) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshStateFromServer(), 350);
}

function isUnlocked(house) {
  return State.unlockedHouses.includes(Number(house.id));
}

function unlockProgressFor(house) {
  if (!house.unlock) return { have: 1, need: 1 };
  const { type, need } = house.unlock;
  return { have: Number(State.progress[type]) || 0, need };
}

function unlockLabel(house) {
  if (!house.unlock) return '';
  const { type, need } = house.unlock;
  if (type === 'referrals') return need === 1 ? T.oneReferral : T.referralsN(need);
  if (type === 'ads') return T.adsN(need);
  if (type === 'deposit') return T.depositN(need);
  return '';
}

function checkUnlocks() {
  if (State.serverConnected && typeof renderBoxes === 'function') renderBoxes();
}

function renderBalance() {
  const balance = Number(State.balance) || 0;
  const balanceElement = document.getElementById('balanceAmount');
  if (balanceElement) balanceElement.textContent = balance.toFixed(5);
  const walletBalance = document.getElementById('walletBalanceAmount');
  if (walletBalance) walletBalance.textContent = balance.toFixed(5);
  if (typeof renderWalletProgress === 'function') renderWalletProgress();
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

window.addEventListener('load', async () => {
  await loadStateFromServer();
  if (hasStateApi) {
    setInterval(() => refreshStateFromServer(), 20000);
  }
});