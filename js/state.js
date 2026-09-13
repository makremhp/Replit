/* ===================== الحالة العامة — المصدر الوحيد هو الخادم ===================== */
const STATE_API_URL = '/api/state';
function getTelegramInitData() {
  return String(window.Telegram?.WebApp?.initData || '');
}

function requireTelegramInitData() {
  const initData = getTelegramInitData();
  if (!initData) throw new Error('افتح التطبيق من داخل Telegram فقط');
  return initData;
}

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

const State = {
  clientId: '',
  balance: 0,
  progress: { referrals: 0, ads: 0, deposit: 0 },
  unlockedHouses: [1],
  activeHouseId: 1,
  tonAddress: '',
  serverConnected: false,
  syncing: false,
};

let stateHydrating = false;
let syncTimer = null;
let refreshTimer = null;
let collectQueue = Promise.resolve();

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

function clearServerState() {
  State.balance = 0;
  State.progress = { referrals: 0, ads: 0, deposit: 0 };
  State.unlockedHouses = [1];
  State.activeHouseId = 1;
  State.tonAddress = '';
  State.serverConnected = false;
}

function applyServerState(data) {
  if (!data) return;
  State.balance = Number(data.balance) || 0;
  State.progress = data.progress || { referrals: 0, ads: 0, deposit: 0 };
  State.unlockedHouses = Array.isArray(data.unlockedHouses) ? data.unlockedHouses : [1];
  State.activeHouseId = Number(data.activeHouseId) || 1;
  State.tonAddress = data.tonAddress || '';
  State.serverConnected = true;
  renderBalance();
}

async function requestState(method = 'GET') {
  if (!hasStateApi) throw new Error('State API is unavailable in local file mode');
  const options = { method, headers: { 'X-Telegram-Init-Data': requireTelegramInitData() } };
  if (method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(statePayload());
  }
  const response = await fetch(STATE_API_URL, options);
  if (!response.ok) throw new Error(`State API returned ${response.status}`);
  return response.json();
}

async function loadStateFromServer() {
  if (!hasStateApi) {
    clearServerState();
    return false;
  }
  try {
    stateHydrating = true;
    applyServerState(await requestState('GET'));
    return true;
  } catch (error) {
    clearServerState();
    renderBalance();
    console.error('Database state unavailable; local balance is disabled.', error);
    if (typeof showToast === 'function') showToast('قاعدة البيانات غير متاحة — لم يتم استخدام رصيد محلي');
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
    console.error('Database sync failed; local balance is disabled.', error);
    if (typeof showToast === 'function') showToast('فشل حفظ البيانات في قاعدة البيانات');
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
  scheduleStateSync();
}

async function refreshStateFromServer() {
  if (!hasStateApi || State.syncing) return;
  try {
    applyServerState(await requestState('GET'));
  } catch (error) {
    State.serverConnected = false;
    console.error('Database refresh failed; local balance is disabled.', error);
  }
}

function collectCoinFromServer(houseId) {
  const collectRequest = collectQueue.then(async () => {
    if (!hasStateApi || !State.serverConnected) return false;
    try {
      const response = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': requireTelegramInitData() },
        body: JSON.stringify({ houseId: Number(houseId) }),
      });
      if (!response.ok) throw new Error(`Collect API returned ${response.status}`);
      applyServerState(await response.json());
      return true;
    } catch (error) {
      State.serverConnected = false;
      console.error('Database collect failed; local balance is disabled.', error);
      if (typeof showToast === 'function') showToast('تعذر تسجيل العملية في قاعدة البيانات');
      return false;
    }
  });
  collectQueue = collectRequest.catch(() => false);
  return collectRequest;
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
  if (State.serverConnected) renderBoxes();
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
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
