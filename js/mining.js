/* ===================== العملات التي يقررها الخادم ===================== */
const stage = document.getElementById('miningStage');
const activeCoins = new Map();
let coinAudioContext = null;
let queuedCoinId = '';

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

function coinPosition(id, rect) {
  let hash = 0;
  for (const character of String(id)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const maxX = Math.max(12, rect.width - 48);
  const maxY = Math.max(48, rect.height * 0.65);
  return {
    x: 12 + (hash % Math.max(1, Math.floor(maxX - 12))),
    y: 18 + ((hash >>> 8) % Math.max(1, Math.floor(maxY - 18))),
  };
}

function spawnFloatText(x, y, text) {
  const textEl = document.createElement('div');
  textEl.className = 'floattext';
  textEl.textContent = text;
  textEl.style.left = `${x}px`;
  textEl.style.top = `${y}px`;
  stage.appendChild(textEl);
  setTimeout(() => textEl.remove(), 900);
}

function removeLocalCoin(id) {
  const element = activeCoins.get(id);
  if (!element) return;
  activeCoins.delete(id);
  element.remove();
}

function collectCoinElement(element) {
  const coinId = element.dataset.coinId;
  if (!coinId || queuedCoinId) return;
  queuedCoinId = coinId;
  const x = Number(element.dataset.x) || 0;
  const y = Number(element.dataset.y) || 0;
  const value = Number(element.dataset.value) || 0;
  removeLocalCoin(coinId);
  playCoinCollectSound();
  spawnFloatText(x + 18, y + 18, `+${value.toFixed(5)}$`);
  collectCoinFromServer(coinId).finally(() => { queuedCoinId = ''; });
}

function renderServerCoins(coins) {
  if (!stage) return;
  const known = new Set(coins.map(coin => String(coin.id)));
  for (const id of [...activeCoins.keys()]) {
    if (!known.has(id)) removeLocalCoin(id);
  }
  const rect = stage.getBoundingClientRect();
  for (const coin of coins) {
    const id = String(coin.id);
    if (activeCoins.has(id)) continue;
    const position = coinPosition(id, rect);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'coin';
    element.dataset.coinId = id;
    element.dataset.value = String(Number(coin.value) || 0);
    element.dataset.x = String(position.x);
    element.dataset.y = String(position.y);
    element.setAttribute('aria-label', T.collectCoin);
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.backgroundImage = 'url("asesst/coin-usdt.png")';
    stage.appendChild(element);
    activeCoins.set(id, element);
  }
}

if (stage) {
  stage.addEventListener('click', event => {
    const coin = event.target.closest('.coin');
    if (coin) {
      event.stopPropagation();
      collectCoinElement(coin);
    }
  });
}

function startMining() {
  renderServerCoins(State.collectibles || []);
}

function stopMining() {}
function spawnCoin() {}
function spawnCoins() {}