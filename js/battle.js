/* ===================== ساحة المعركة المفتوحة (أسفل الشاشة) ===================== */
const stage = document.getElementById('battleStage');
const fxLayer = document.getElementById('fxLayer');
const zombieSound = document.getElementById('zombieSound');
let zombies = [];
let lastFire = 0;
let bulletActive = false;
let lastZombieSoundAt = 0;

function playZombieSound() {
  const now = performance.now();
  if (now - lastZombieSoundAt < 720) return;
  lastZombieSoundAt = now;
  const snd = zombieSound.cloneNode(true);
  snd.volume = 0.28;
  snd.play().catch(() => {});
}

function spawnZombie(house) {
  const rect = stage.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'zombie';
  if (zombies.length >= MAX_ZOMBIES) return;
  const zombieSprite = house.zombie;
  el.style.backgroundImage = 'url("' + zombieSprite + '")';
  const laneX = 10 + Math.random() * (rect.width - 62);
  el.style.left = laneX + 'px';
  el.style.bottom = '0px';
  stage.appendChild(el);
  zombies.push({ el, x: laneX, progress: 0, alive: true });
  playZombieSound();
}

/* نقطة الإطلاق = مكان البيت النشط الفعلي داخل شبكة الاختيار (لا بيت ثاني بالساحة) */
function muzzlePoint(house) {
  const thumb = boxThumbEls[house.id];
  const r = thumb.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height * 0.2,
  };
}

function fireAt(house, zombie) {
  bulletActive = true;
  const muzzle = muzzlePoint(house);
  let x = muzzle.x, y = muzzle.y;

  const zRect0 = zombie.el.getBoundingClientRect();
  const initDist = Math.hypot(
    (zRect0.left + zRect0.width / 2) - x,
    (zRect0.top + zRect0.height * 0.3) - y
  ) || 1;
  const speed = initDist / BULLET_TRAVEL_MS; // px/ms — كل الطلقات تاخذ نفس المدة تقريبًا بغض النظر عن المسافة

  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  bullet.style.backgroundImage = 'url("' + house.bullet + '")';
  bullet.style.left = x + 'px';
  bullet.style.top = y + 'px';
  fxLayer.appendChild(bullet);

  let last = performance.now();
  function step(now) {
    if (!zombie.alive) { bullet.remove(); bulletActive = false; return; }
    const dt = now - last;
    last = now;
    const zRect = zombie.el.getBoundingClientRect();
    const tx = zRect.left + zRect.width / 2;
    const ty = zRect.top + zRect.height * 0.3;
    const dx = tx - x, dy = ty - y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    bullet.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;

    if (dist < 16) {
      bullet.remove();
      explodeAt(house, tx, ty);
      killZombie(zombie, house);
      bulletActive = false;
      return;
    }
    const move = Math.min(dist, speed * dt);
    x += (dx / dist) * move;
    y += (dy / dist) * move;
    bullet.style.left = x + 'px';
    bullet.style.top = y + 'px';
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function explodeAt(house, x, y) {
  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.style.backgroundImage = 'url("' + house.fx + '")';
  fx.style.left = x + 'px';
  fx.style.top = y + 'px';
  fxLayer.appendChild(fx);
  setTimeout(() => fx.remove(), 620);
}

function killZombie(zombie, house) {
  if (!zombie.alive) return;
  zombie.alive = false;
  zombie.el.classList.add('dying');
  if (house && house.perk && house.perk.type === 'killBonus' && Math.random() < house.perk.chance) {
    const sRect = stage.getBoundingClientRect();
    const zRect = zombie.el.getBoundingClientRect();
    const relX = zRect.left - sRect.left + zRect.width / 2;
    const relY = zRect.top - sRect.top;
    addBalance(currentCoinValue() * (house.perk.amountMultiplier || 1), relX, relY);
  }
  setTimeout(() => zombie.el.remove(), 400);
  zombies = zombies.filter(z => z !== zombie);
}

/* ===================== عملات الرصيد داخل الساحة ===================== */
let currentCoinEl = null;

function currentCoinValue() {
  const h = HOUSES.find(x => x.id === State.activeHouseId);
  if (h && h.perk && h.perk.type === 'coinValue') return COIN_VALUE * h.perk.multiplier;
  return COIN_VALUE;
}

function spawnCoin() {
  if (currentCoinEl) { currentCoinEl.remove(); currentCoinEl = null; }
  const rect = stage.getBoundingClientRect();
  const coin = document.createElement('div');
  coin.className = 'coin';
  const cx = 12 + Math.random() * (rect.width - 40);
  const cy = 14 + Math.random() * (rect.height * 0.4);
  coin.style.left = cx + 'px';
  coin.style.top = cy + 'px';
  coin.style.backgroundImage = 'url("asesst/coin-usdt.png")';
  coin.addEventListener('click', (e) => {
    e.stopPropagation();
    addBalance(currentCoinValue(), cx + 14, cy);
    coin.remove();
    if (currentCoinEl === coin) currentCoinEl = null;
  });
  stage.appendChild(coin);
  currentCoinEl = coin;
}

function addBalance(amount, x, y) {
  State.balance += amount;
  saveState();
  renderBalance();
  spawnFloatText(x, y, `+${amount.toFixed(3)}$`);
}

function spawnFloatText(x, y, text) {
  const t = document.createElement('div');
  t.className = 'floattext';
  t.textContent = text;
  t.style.left = x + 'px';
  t.style.top = y + 'px';
  stage.appendChild(t);
  setTimeout(() => t.remove(), 900);
}

function gameTick(house) {
  const rect = stage.getBoundingClientRect();
  zombies.forEach(z => {
    if (!z.alive) return;
    z.progress = Math.min(1, z.progress + ZOMBIE_SPEED);
    const bottom = z.progress * (rect.height * 0.78);
    z.el.style.transform = `translate3d(0, -${bottom}px, 0)`;
    if (z.progress >= 1) killZombie(z, house);
  });

  const now = performance.now();
  const fireCooldown = house.fireCooldownMs || FIRE_COOLDOWN_MS;
  if (!bulletActive && zombies.length && now - lastFire > fireCooldown) {
    const target = zombies.reduce((a, b) => (a.progress > b.progress ? a : b));
    fireAt(house, target);
    lastFire = now;
  }
}

let battleTimers = [];
function startBattle(house) {
  stopBattle();
  const spawnT = setInterval(() => spawnZombie(house), ZOMBIE_SPAWN_MS);
  const tickT = setInterval(() => gameTick(house), TICK_MS);
  const coinInterval = (house.perk && house.perk.type === 'coinRate') ? house.perk.intervalMs : COIN_INTERVAL_MS;
  const coinT = setInterval(spawnCoin, coinInterval);
  const firstCoin = setTimeout(spawnCoin, 2000);
  battleTimers = [spawnT, tickT, coinT, firstCoin];

  if (house.perk && house.perk.type === 'passive') {
    const passiveT = setInterval(() => {
      const rect = stage.getBoundingClientRect();
      addBalance(house.perk.amount, rect.width / 2, 26);
    }, house.perk.intervalMs);
    battleTimers.push(passiveT);
  }
}

function stopBattle() {
  battleTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  battleTimers = [];
  zombies.forEach(z => { z.alive = false; z.el.remove(); });
  zombies = [];
  bulletActive = false;
  if (currentCoinEl) { currentCoinEl.remove(); currentCoinEl = null; }
}

/* ===================== تشغيل اللعبة ===================== */
renderBalance();
renderBoxes();
checkUnlocks();
const activeHouse = HOUSES.find(h => h.id === State.activeHouseId) || HOUSES[0];
startBattle(activeHouse);

/* =========================================================
   نقاط ربط لاحقة بالباك إند الحقيقي:
   - State.progress.referrals / ads / deposit ← تحدَّث من السيرفر الحقيقي
   - State.balance ← يُزامن مع رصيد المستخدم في قاعدة البيانات
   بعد أي تحديث حقيقي: نادِ checkUnlocks() و saveState() و renderBalance()
   ========================================================= */
