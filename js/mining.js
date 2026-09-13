/* ===================== ساحة تعدين العملات ===================== */
const stage = document.getElementById('miningStage');
let currentCoinEl = null;
let miningTimer = null;
let coinAudioContext = null;

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

function collectCoin(coin, x, y) {
  if (coin !== currentCoinEl) return;
  playCoinCollectSound();
  addBalance(currentCoinValue(), x, y);
  coin.remove();
  currentCoinEl = null;
}

function spawnCoin() {
  if (currentCoinEl) return;

  const rect = stage.getBoundingClientRect();
  const coin = document.createElement('button');
  coin.type = 'button';
  coin.className = 'coin';
  coin.setAttribute('aria-label', T.collectCoin);
  const maxX = Math.max(12, rect.width - 48);
  const maxY = Math.max(48, rect.height * 0.65);
  const x = 12 + Math.random() * (maxX - 12);
  const y = 18 + Math.random() * (maxY - 18);
  coin.style.left = x + 'px';
  coin.style.top = y + 'px';
  coin.style.backgroundImage = 'url("asesst/coin-usdt.png")';
  coin.addEventListener('click', event => {
    event.stopPropagation();
    collectCoin(coin, x + 18, y);
  }, { once: true });
  stage.appendChild(coin);
  currentCoinEl = coin;
}

function startMining(house) {
  stopMining();
  spawnCoin();
  miningTimer = setInterval(spawnCoin, house.coinIntervalMs);
}

function stopMining() {
  if (miningTimer) {
    clearInterval(miningTimer);
    miningTimer = null;
  }
  if (currentCoinEl) {
    currentCoinEl.remove();
    currentCoinEl = null;
  }
}

renderBalance();
renderBoxes();
checkUnlocks();
startMining(currentHouse());