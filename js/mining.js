/* ===================== ساحة تعدين العملات ===================== */
const stage = document.getElementById('miningStage');
const activeCoins = new Set();
const MAX_ACTIVE_COINS = 50;
let miningTimer = null;
let stateSyncTimer = null;
let coinAudioContext = null;
let nextWaveSize = 1;

function currentHouse() {
  return HOUSES.find(house => house.id === State.activeHouseId) || HOUSES[0];
}

function currentCoinValue() {
  return currentHouse().coinValue;
}

function playCoinCollectSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    if (!coinAudioContext) coinAudioContext = new AudioContext();
    if (coinAudioContext.state === 'suspended') coinAudioContext.resume().catch(() => {});
    const now = coinAudioContext.currentTime;
    const oscillator = coinAudioContext.createOscillator();
    const gain = coinAudioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(1240, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(coinAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
  } catch (_) {}
}

function spawnFloatText(x, y, text) {
  const textEl = document.createElement('div');
  textEl.className = 'floattext';
  textEl.textContent = text;
  textEl.style.left = x + 'px';
  textEl.style.top = y + 'px';
  stage.appendChild(textEl);
  setTimeout(() => textEl.remove(), 900);
}

function addBalance(amount, x, y) {
  if (!State.serverConnected) {
    showToast('الاتصال بقاعدة البيانات غير متاح');
    return;
  }
  spawnFloatText(x, y, `+${amount.toFixed(5)}$`);
  collectCoinFromServer(currentHouse().id).then(collected => {
    if (!collected) showToast('لم تتم إضافة الرصيد — تعذر الوصول للخادم');
  });
}

function collectCoin(coin) {
  if (!activeCoins.has(coin)) return;
  const sourceX = Number(coin.dataset.x);
  const sourceY = Number(coin.dataset.y);
  const coinValue = Number(coin.dataset.value);
  playCoinCollectSound();
  activeCoins.delete(coin);
  coin.remove();
  addBalance(coinValue, sourceX + 18, sourceY + 18);
}

function spawnCoin() {
  if (activeCoins.size >= MAX_ACTIVE_COINS) return;
  const rect = stage.getBoundingClientRect();
  const coin = document.createElement('button');
  coin.type = 'button';
  coin.className = 'coin';
  coin.setAttribute('aria-label', T.collectCoin);
  const maxX = Math.max(12, rect.width - 48);
  const maxY = Math.max(48, rect.height * 0.65);
  const x = 12 + Math.random() * (maxX - 12);
  const y = 18 + Math.random() * (maxY - 18);
  coin.dataset.x = String(x);
  coin.dataset.y = String(y);
  coin.dataset.value = String(currentCoinValue());
  coin.style.left = x + 'px';
  coin.style.top = y + 'px';
  coin.style.backgroundImage = 'url("asesst/coin-usdt.png")';
  coin.addEventListener('click', event => {
    event.stopPropagation();
    collectCoin(coin);
  }, { once: true });
  stage.appendChild(coin);
  activeCoins.add(coin);
}

function spawnCoins(count) {
  for (let index = 0; index < count; index += 1) {
    if (activeCoins.size >= MAX_ACTIVE_COINS) break;
    spawnCoin();
  }
}

function startMining(house) {
  stopMining();
  nextWaveSize = 1;
  spawnCoins(1);
  const waveInterval = Math.max(3000, house?.coinIntervalMs || 15000);
  miningTimer = setInterval(() => {
    spawnCoins(nextWaveSize);
    nextWaveSize = Math.min(nextWaveSize + 1, 6);
  }, waveInterval);
  stateSyncTimer = setInterval(() => refreshStateFromServer(), 5000);
}

function stopMining() {
  if (miningTimer) { clearInterval(miningTimer); miningTimer = null; }
  if (stateSyncTimer) { clearInterval(stateSyncTimer); stateSyncTimer = null; }
  activeCoins.forEach(coin => coin.remove());
  activeCoins.clear();
}

(async function bootApp() {
  renderBalance();
  renderBoxes();
  await loadStateFromServer();
  renderBalance();
  renderBoxes();
  checkUnlocks();
  preloadHouseAssets();
  startMining(currentHouse());
})();
