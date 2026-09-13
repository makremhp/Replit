/* ===================== شبكة اختيار البيوت (بدون معركة داخلها) ===================== */
const boxThumbEls = {}; // houseId -> the house-thumb <img> element, used as the firing point
function renderBoxes() {
  const wrap = document.getElementById('boxesWrap');
  wrap.innerHTML = '';
  HOUSES.forEach(house => {
    const unlocked = isUnlocked(house);
    const box = document.createElement('div');
    box.className = 'box' + (unlocked ? ' unlocked' : ' locked') + (house.id === State.activeHouseId ? ' active' : '');

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = hName(house);
    box.appendChild(label);

    const thumb = document.createElement('img');
    thumb.className = 'house-thumb';
    thumb.src = house.img;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.alt = hName(house);
    box.appendChild(thumb);
    boxThumbEls[house.id] = thumb;

    if (!unlocked) {
      const badge = document.createElement('div');
      badge.className = 'lockbadge';
      badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1 1 12 0v2" stroke="#d4af37" stroke-width="2" stroke-linecap="round"/><rect x="4" y="10" width="16" height="10" rx="2" stroke="#d4af37" stroke-width="2"/></svg>';
      box.appendChild(badge);

      const p = unlockProgressFor(house);
      const need = document.createElement('div');
      need.className = 'need';
      need.textContent = unlockLabel(house);
      box.appendChild(need);

      const track = document.createElement('div');
      track.className = 'progress-track';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = Math.min(100, (p.have / p.need) * 100) + '%';
      track.appendChild(fill);
      box.appendChild(track);
    }

    box.addEventListener('click', () => openHouseModal(house));
    wrap.appendChild(box);
  });
}

function preloadHouseAssets() {
  const active = HOUSES.find(h => h.id === State.activeHouseId) || HOUSES[0];
  const sources = new Set(['asesst/coin-usdt.png', active.img]);
  HOUSES.forEach(h => sources.add(h.img));
  const load = () => sources.forEach(src => { const image = new Image(); image.decoding = 'async'; image.src = src; });
  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 1200 });
  else setTimeout(load, 700);
}

function activateHouse(house) {
  if (house.id === State.activeHouseId) return;
  stopMining();
  State.activeHouseId = house.id;
  saveState();
  renderBoxes();
  startMining(house);
}

function formatProgress(p, type) {
  if (type === 'deposit') return `$${p.have.toFixed(3)} / $${p.need}`;
  return `${p.have} / ${p.need}`;
}

/* ===================== نافذة معلومات البيت (تظهر وسط الشاشة عند الضغط) ===================== */
const houseModal = document.getElementById('houseModal');
const modalHouseImg = document.getElementById('modalHouseImg');
const modalName = document.getElementById('modalName');
const modalStatus = document.getElementById('modalStatus');
const modalPerk = document.getElementById('modalPerk');
const modalProgressTrack = document.getElementById('modalProgressTrack');
const modalProgressFill = document.getElementById('modalProgressFill');
const modalActionBtn = document.getElementById('modalActionBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

function openHouseModal(house) {
  const unlocked = isUnlocked(house);
  const isActive = house.id === State.activeHouseId;

  modalHouseImg.src = house.img;
  modalHouseImg.alt = hName(house);
  modalName.textContent = hName(house);
  modalPerk.textContent = hPerkDesc(house) || '';

  modalProgressTrack.style.display = 'none';
  if (!unlocked) {
    const p = unlockProgressFor(house);
    modalStatus.textContent = T.statusLocked(unlockLabel(house), formatProgress(p, house.unlock.type));
    modalStatus.className = 'modal-status is-locked';
    modalProgressTrack.style.display = 'block';
    modalProgressFill.style.width = Math.min(100, (p.have / p.need) * 100) + '%';
    modalActionBtn.textContent = T.lockedBtn;
    modalActionBtn.className = 'modal-btn disabled';
    modalActionBtn.onclick = null;
  } else if (isActive) {
    modalStatus.textContent = T.statusActive;
    modalStatus.className = 'modal-status is-active';
    modalActionBtn.textContent = T.activeBtn;
    modalActionBtn.className = 'modal-btn disabled';
    modalActionBtn.onclick = null;
  } else {
    modalStatus.textContent = T.statusUnlocked;
    modalStatus.className = 'modal-status is-unlocked';
    modalActionBtn.textContent = T.activateBtn;
    modalActionBtn.className = 'modal-btn primary';
    modalActionBtn.onclick = () => { activateHouse(house); closeHouseModal(); };
  }

  houseModal.classList.add('show');
}

function closeHouseModal() {
  houseModal.classList.remove('show');
}

modalCloseBtn.textContent = T.closeBtn;
modalCloseBtn.addEventListener('click', closeHouseModal);
houseModal.addEventListener('click', (e) => { if (e.target === houseModal) closeHouseModal(); });
