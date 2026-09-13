/* ===================== الحالة العامة (نموذج تجريبي محلي) ===================== */
const State = {
  balance: parseFloat(localStorage.getItem('sh_balance') || '0'),
  progress: JSON.parse(localStorage.getItem('sh_progress') || '{"referrals":0,"ads":0,"deposit":0}'),
  unlockedHouses: JSON.parse(localStorage.getItem('sh_unlocked') || '[1]'),
  activeHouseId: parseInt(localStorage.getItem('sh_active') || '1', 10),
};

function saveState() {
  localStorage.setItem('sh_balance', State.balance.toFixed(6));
  localStorage.setItem('sh_progress', JSON.stringify(State.progress));
  localStorage.setItem('sh_unlocked', JSON.stringify(State.unlockedHouses));
  localStorage.setItem('sh_active', String(State.activeHouseId));
}

function isUnlocked(house) { return house.unlocked || State.unlockedHouses.includes(house.id); }

function unlockProgressFor(house) {
  if (!house.unlock) return { have: 1, need: 1 };
  const { type, need } = house.unlock;
  if (type === 'referrals') return { have: State.progress.referrals, need };
  if (type === 'ads')       return { have: State.progress.ads, need };
  if (type === 'deposit')   return { have: State.progress.deposit, need };
  return { have: 0, need: 1 };
}

function unlockLabel(house) {
  if (!house.unlock) return '';
  const { type, need } = house.unlock;
  if (type === 'referrals') return need === 1 ? T.oneReferral : T.referralsN(need);
  if (type === 'ads')       return T.adsN(need);
  if (type === 'deposit')   return T.depositN(need);
  return '';
}

function checkUnlocks() {
  let changed = false;
  HOUSES.forEach(h => {
    if (h.unlocked || State.unlockedHouses.includes(h.id)) return;
    const p = unlockProgressFor(h);
    if (p.have >= p.need) {
      State.unlockedHouses.push(h.id);
      changed = true;
      showToast(T.unlockedToast(hName(h)));
    }
  });
  if (changed) { saveState(); renderBoxes(); }
}

function renderBalance() {
  document.getElementById('balanceAmount').textContent = State.balance.toFixed(5);
  const w = document.getElementById('walletBalanceAmount');
  if (w) w.textContent = State.balance.toFixed(5);
  if (typeof renderWalletProgress === 'function') renderWalletProgress();
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
