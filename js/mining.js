/* ===================== ساحة تعدين العملات ===================== */
const stage = document.getElementById('miningStage');
const activeCoins = new Set();
const MAX_ACTIVE_COINS = 50;
const COIN_COLLECT_RADIUS = 82;
const COIN_WAVE_INTERVAL_MS = 30000;
let miningTimer = null;
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
  } catch (_) {
    // Audio is optional and must never interrupt coin collection.
  }
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
  State.balance += amount;
  saveState();
  renderBalance();
  spawnFloatText(x, y, `+${amount.toFixed(5)}$`);
}

function collectCoinGroup(coin) {
  if (!activeCoins.has(coin)) return;

  const sourceX = Number(coin.dataset.x);
  const sourceY = Number(coin.dataset.y);
  const coinsToCollect = [...activeCoins].filter(candidate => {
    const dx = Number(candidate.dataset.x) - sourceX;
    const dy = Number(candidate.dataset.y) - sourceY;
    return Math.hypot(dx, dy) <= COIN_COLLECT_RADIUS;
  });
  if (!coinsToCollect.length) return;

  const totalValue = coinsToCollect.reduce((total, candidate) => (
    total + Number(candidate.dataset.value)
  ), 0);

  playCoinCollectSound();
  coinsToCollect.forEach(candidate => {
    activeCoins.delete(candidate);
    candidate.remove();
  });
  addBalance(totalValue, sourceX + 18, sourceY + 18);
  if (!activeCoins.size) nextWaveSize = 1;
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
    collectCoinGroup(coin);
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
  miningTimer = setInterval(() => {
    spawnCoins(nextWaveSize);
    nextWaveSize += 1;
  }, COIN_WAVE_INTERVAL_MS);
}

function stopMining() {
  if (miningTimer) {
    clearInterval(miningTimer);
    miningTimer = null;
  }
  activeCoins.forEach(coin => coin.remove());
  activeCoins.clear();
}

renderBalance();
renderBoxes();
checkUnlocks();
startMining(currentHouse());