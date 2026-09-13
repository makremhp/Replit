/* ===================== الحالة العامة والمزامنة مع قاعدة البيانات ===================== */
const STATE_API_URL = '/api/state';
const CLIENT_ID_KEY = 'sh_client_id';
const hasStateApi = window.location.protocol !== 'file:' && typeof fetch === 'function';

function getClientId() {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    clientId = `client-${randomId}`;
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function readStoredJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (_) {
    return fallback;
  }
}

const State = {
  clientId: getClientId(),
  balance: parseFloat(localStorage.getItem('sh_balance') || '0') || 0,
  progress: readStoredJson('sh_progress', { referrals: 0, ads: 0, deposit: 0 }),
  unlockedHouses: readStoredJson('sh_unlocked', [1]),
  activeHouseId: parseInt(localStorage.getItem('sh_active') || '1', 10) || 1,
  tonAddress: localStorage.getItem('sh_ton_address') || '',
  serverConnected: false,
  syncing: false,
};

let stateHydrating = false;
let syncTimer = null;
let refreshTimer = null;

function persistLocalState() {
  localStorage.setItem('sh_balance', Number(State.balance || 0).toFixed(6));
  localStorage.setItem('sh_progress', JSON.stringify(State.progress));
  localStorage.setItem('sh_unlocked', JSON.stringify(State.unlockedHouses));
  localStorage.setItem('sh_active', String(State.activeHouseId));
  if (State.tonAddress) localStorage.setItem('sh_ton_address', State.tonAddress);
  else localStorage.removeItem('sh_ton_address');
}

function statePayload() {
  return {
    progress: {
      referrals: Number(State.progress.referrals) || 0,
      ads: Number(State.progress.ads) || 0,
      deposit: Number(State.progress.deposit) || 0,
    },
    activeHouseId: Number(State.activeHouseId) || 1,
    tonAddress: State.tonAddress || null,
  };
}

function applyServerState(data) {
  if (!data) return;
  State.balance = Number(data.balance) || 0;
  State.progress = data.progress || State.progress;
  State.unlockedHouses = Array.isArray(data.unlockedHouses) ? data.unlockedHouses : State.unlockedHouses;
  State.activeHouseId = Number(data.activeHouseId) || 1;
  State.tonAddress = data.tonAddress || '';
  State.serverConnected = true;
  persistLocalState();
  renderBalance();
}

async function requestState(method = 'GET') {
  if (!hasStateApi) throw new Error('State API is unavailable in local file mode');
  const options = {
    method,
    headers: { 'X-Client-Id': State.clientId },
  };
  if (method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(statePayload());
  }
  const response = await fetch(STATE_API_URL, options);
  if (!response.ok) throw new Error(`State API returned ${response.status}`);
  return response.json();
}

async function loadStateFromServer() {
  if (!hasStateApi) return false;
  try {
    stateHydrating = true;
    applyServerState(await requestState('GET'));
    return true;
  } catch (error) {
    State.serverConnected = false;
    console.warn('Database state unavailable; using local fallback.', error);
    return false;
  } finally {
    stateHydrating = false;
  }
}

async function syncStateToServer() {
  if (!hasStateApi || !State.serverConnected || State.syncing) return;
  State.syncing = true;
  try {
    applyServerState(await requestState('POST'));
  } catch (error) {
    State.serverConnected = false;
    console.warn('Database sync failed; local fallback remains active.', error);
  } finally {
    State.syncing = false;
  }
}

function scheduleStateSync() {
  if (stateHydrating || !State.serverConnected) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncStateToServer(), 250);
}

function saveState() {
  persistLocalState();
  scheduleStateSync();
}

async function refreshStateFromServer() {
  if (!hasStateApi || State.syncing) return;
  try {
    applyServerState(await requestState('GET'));
  } catch (error) {
    State.serverConnected = false;
    console.warn('Database refresh failed; local fallback remains active.', error);
  }
}

function requestServerRefresh() {
  if (!State.serverConnected) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshStateFromServer(), 350);
}

function isUnlocked(house) {
  return house.unlocked || State.unlockedHouses.includes(house.id);
}

function unlockProgressFor(house) {
  if (!house.unlock) return { have: 1, need: 1 };
  const { type, need } = house.unlock;
  if (type === 'referrals') return { have: State.progress.referrals, need };
  if (type === 'ads') return { have: State.progress.ads, need };
  if (type === 'deposit') return { have: State.progress.deposit, need };
  return { have: 0, need: 1 };
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
  let changed = false;
  HOUSES.forEach(house => {
    if (house.unlocked || State.unlockedHouses.includes(house.id)) return;
    const progress = unlockProgressFor(house);
    if (progress.have >= progress.need) {
      State.unlockedHouses.push(house.id);
      changed = true;
      showToast(T.unlockedToast(hName(house)));
    }
  });
  if (changed) {
    saveState();
    renderBoxes();
  }
}

function renderBalance() {
  document.getElementById('balanceAmount').textContent = State.balance.toFixed(5);
  const walletBalance = document.getElementById('walletBalanceAmount');
  if (walletBalance) walletBalance.textContent = State.balance.toFixed(5);
  if (typeof renderWalletProgress === 'function') renderWalletProgress();
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}