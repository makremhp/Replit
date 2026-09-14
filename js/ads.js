/* ===================== إعلانات محكومة بالخادم ===================== */
let currentVerifiedAdSession = null;

function renderAdSlot(containerId, key) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  const frame = document.createElement('div');
  frame.className = 'ad-slot-placeholder';
  frame.dataset.adKey = key || '';
  frame.textContent = 'Advertisement';
  container.appendChild(frame);
}

async function startVerifiedAd() {
  try {
    currentVerifiedAdSession = await startAdSession();
    showToast('تم فتح جلسة الإعلان — انتظر تحقق مزود الإعلانات');
    return currentVerifiedAdSession;
  } catch (error) {
    showToast(error.message || 'لا يمكن بدء الإعلان الآن');
    return null;
  }
}

async function finishVerifiedAd() {
  if (!currentVerifiedAdSession?.sessionId) return false;
  try {
    await completeAdSession(currentVerifiedAdSession.sessionId);
    currentVerifiedAdSession = null;
    showToast('تمت إضافة المكافأة بعد التحقق');
    return true;
  } catch (error) {
    showToast(error.message || 'لم يتم التحقق من الإعلان');
    return false;
  }
}

/* ===================== إعلانات 320×50 وSocial — إعدادات من الخادم ===================== */
const MAX_VISIBLE_FIXED_ADS = 3;
const DEFAULT_TOP_FIXED_AD_ROTATION_MS = 5000;
const DEFAULT_BOTTOM_FIXED_AD_ROTATION_MS = 10000;
const SOCIAL_AD_DURATION_MS = 5000;
const AD_SLOT_HEIGHT = 50;
const AD_SLOT_GAP = 5;
let fixedAdSignature = '';
let fixedAdTopRotationTimer = null;
let fixedAdBottomRotationTimer = null;
let socialAdRotationTimer = null;
let socialAdRunId = 0;
let adPool = [];
let currentTopAdUnits = [];
let currentBottomAdUnits = [];
let fixedAdTopVisibleCount = MAX_VISIBLE_FIXED_ADS;
let fixedAdBottomVisibleCount = MAX_VISIBLE_FIXED_ADS;
let fixedAdTopRotationMs = DEFAULT_TOP_FIXED_AD_ROTATION_MS;
let fixedAdBottomRotationMs = DEFAULT_BOTTOM_FIXED_AD_ROTATION_MS;

function configuredFixedAdUnits() {
  const units = typeof State !== 'undefined' ? State.config?.fixedAdUnits : [];
  if (!Array.isArray(units)) return [];
  const seenKeys = new Set();
  return units.filter(unit => {
    const key = String(unit?.key || '').trim();
    const src = String(unit?.src || '').trim();
    if (!key || !src || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

// The ad pool is populated only from the server-provided State.config values.
function loadAdPool() {
  adPool = configuredFixedAdUnits();
  return adPool;
}

function configuredSocialAdScripts() {
  const scripts = typeof State !== 'undefined' ? State.config?.socialAdScripts : [];
  return Array.isArray(scripts) ? scripts.filter(Boolean) : [];
}

function renderMissingAdSlots(containerId, configuredCount) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const visibleCount = normalizeVisibleAdCount(configuredCount);
  setAdSideHeight(container, visibleCount);
  container.replaceChildren();
  for (let index = 0; index < visibleCount; index += 1) {
    const placeholder = document.createElement('div');
    placeholder.className = 'ad-320-slot ad-slot-placeholder';
    placeholder.style.height = String(AD_SLOT_HEIGHT) + 'px';
    placeholder.textContent = 'Ad code is not configured';
    container.appendChild(placeholder);
  }
}

function setAdSideHeight(container, visibleCount) {
  const contentHeight = visibleCount > 0
    ? (visibleCount * AD_SLOT_HEIGHT) + ((visibleCount - 1) * AD_SLOT_GAP)
    : 0;
  container.style.height = String(contentHeight) + 'px';
  container.style.minHeight = '0';
  container.style.overflow = 'hidden';
}

function normalizeVisibleAdCount(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1
    ? Math.min(count, MAX_VISIBLE_FIXED_ADS)
    : MAX_VISIBLE_FIXED_ADS;
}

function normalizeRotationMs(value, fallback) {
  const interval = Number(value);
  return Number.isInteger(interval) && interval >= 1000 && interval <= 3600000
    ? interval
    : fallback;
}

function shuffleAdUnits(units) {
  const shuffled = units.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function adKeys(units) {
  return new Set(units.map(unit => unit.key));
}

function selectAdGroup(units, configuredCount, reservedUnits, previousUnits) {
  const count = Math.min(units.length, normalizeVisibleAdCount(configuredCount));
  if (!count) return [];
  const reservedKeys = adKeys(reservedUnits || []);
  const previousKeys = adKeys(previousUnits || []);
  const available = units.filter(unit => !reservedKeys.has(unit.key));
  const fresh = shuffleAdUnits(available.filter(unit => !previousKeys.has(unit.key)));
  if (fresh.length >= count) return fresh.slice(0, count);
  const selected = fresh.slice();
  const selectedKeys = new Set(selected.map(unit => unit.key));
  const fallback = shuffleAdUnits(available.filter(unit => !selectedKeys.has(unit.key)));
  selected.push(...fallback);
  if (selected.length < count) {
    const crossGroupFallback = shuffleAdUnits(units.filter(unit => !selectedKeys.has(unit.key)));
    selected.push(...crossGroupFallback);
  }
  return selected.slice(0, count);
}

function renderFixedAdSide(containerId, units, configuredCount) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const visibleCount = Math.min(units.length, normalizeVisibleAdCount(configuredCount));
  setAdSideHeight(container, visibleCount);
  container.replaceChildren();
  for (let index = 0; index < visibleCount; index += 1) {
    const unit = units[index];
    const slot = document.createElement('div');
    slot.className = 'ad-320-slot';
    slot.style.height = String(AD_SLOT_HEIGHT) + 'px';
    slot.style.minHeight = String(AD_SLOT_HEIGHT) + 'px';
    slot.style.flex = '0 0 ' + String(AD_SLOT_HEIGHT) + 'px';
    slot.dataset.adIndex = String(index);
    slot.dataset.adKey = unit.key;
    const configScript = document.createElement('script');
    configScript.textContent = 'window.atOptions = ' + JSON.stringify({
      key: unit.key,
      format: unit.format || 'iframe',
      height: AD_SLOT_HEIGHT,
      width: 320,
      params: unit.params || {}
    }) + ';';
    const providerScript = document.createElement('script');
    providerScript.src = unit.src;
    providerScript.async = false;
    providerScript.dataset.fixedAdSlot = containerId;
    providerScript.addEventListener('error', () => {
      slot.replaceChildren();
      slot.classList.add('ad-slot-load-error');
      slot.textContent = 'Advertisement unavailable';
    });
    slot.append(configScript, providerScript);
    container.appendChild(slot);
  }
}

function stopFixedAdRotation() {
  if (fixedAdTopRotationTimer) {
    window.clearInterval(fixedAdTopRotationTimer);
    fixedAdTopRotationTimer = null;
  }
  if (fixedAdBottomRotationTimer) {
    window.clearInterval(fixedAdBottomRotationTimer);
    fixedAdBottomRotationTimer = null;
  }
}

function rotateTopAds() {
  if (!adPool.length) {
    currentTopAdUnits = [];
    renderMissingAdSlots('adTopAds', fixedAdTopVisibleCount);
    return;
  }
  currentTopAdUnits = selectAdGroup(adPool, fixedAdTopVisibleCount, currentBottomAdUnits, currentTopAdUnits);
  renderFixedAdSide('adTopAds', currentTopAdUnits, fixedAdTopVisibleCount);
}

function rotateBottomAds() {
  if (!adPool.length) {
    currentBottomAdUnits = [];
    renderMissingAdSlots('adBottomAds', fixedAdBottomVisibleCount);
    return;
  }
  currentBottomAdUnits = selectAdGroup(adPool, fixedAdBottomVisibleCount, currentTopAdUnits, currentBottomAdUnits);
  renderFixedAdSide('adBottomAds', currentBottomAdUnits, fixedAdBottomVisibleCount);
}

function startFixedAdRotation(units, config = {}) {
  stopFixedAdRotation();
  const topContainer = document.getElementById('adTopAds');
  const bottomContainer = document.getElementById('adBottomAds');
  if (!topContainer || !bottomContainer) return;
  adPool = units.slice();
  fixedAdTopVisibleCount = normalizeVisibleAdCount(config.topVisibleCount);
  fixedAdBottomVisibleCount = normalizeVisibleAdCount(config.bottomVisibleCount);
  fixedAdTopRotationMs = normalizeRotationMs(config.topRotationMs, DEFAULT_TOP_FIXED_AD_ROTATION_MS);
  fixedAdBottomRotationMs = normalizeRotationMs(config.bottomRotationMs, DEFAULT_BOTTOM_FIXED_AD_ROTATION_MS);
  currentTopAdUnits = [];
  currentBottomAdUnits = [];
  rotateTopAds();
  rotateBottomAds();
  if (adPool.length > 1) {
    fixedAdTopRotationTimer = window.setInterval(rotateTopAds, fixedAdTopRotationMs);
    fixedAdBottomRotationTimer = window.setInterval(rotateBottomAds, fixedAdBottomRotationMs);
  }
}
function getSocialAdStage() {
  let stage = document.getElementById('socialAdStage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'socialAdStage';
    stage.className = 'social-ad-stage';
    document.body.appendChild(stage);
  }
  return stage;
}

function stopSocialAdRotation() {
  socialAdRunId += 1;
  if (socialAdRotationTimer) {
    window.clearTimeout(socialAdRotationTimer);
    socialAdRotationTimer = null;
  }
  const stage = document.getElementById('socialAdStage');
  if (stage) stage.replaceChildren();
}

function showSocialAd(index, scripts, runId) {
  if (runId !== socialAdRunId || !scripts.length) return;
  const stage = getSocialAdStage();
  stage.replaceChildren();
  const script = document.createElement('script');
  script.src = scripts[index];
  script.async = false;
  script.dataset.managedAd = 'social';
  stage.appendChild(script);
  socialAdRotationTimer = window.setTimeout(() => {
    if (runId !== socialAdRunId) return;
    stage.replaceChildren();
    socialAdRotationTimer = window.setTimeout(() => {
      showSocialAd((index + 1) % scripts.length, scripts, runId);
    }, 0);
  }, SOCIAL_AD_DURATION_MS);
}

function startSocialAdRotation(scripts) {
  stopSocialAdRotation();
  if (!scripts.length) {
    console.warn('Social ad codes are missing from server configuration');
    return;
  }
  const runId = socialAdRunId;
  showSocialAd(0, scripts, runId);
}

function loadConfiguredAds() {
  const units = loadAdPool();
  const socialScripts = configuredSocialAdScripts();
  const fixedConfig = {
    // The product requirement is always three independent slots per side.
    // Ad keys themselves remain server-provided through loadAdPool().
    topVisibleCount: MAX_VISIBLE_FIXED_ADS,
    bottomVisibleCount: MAX_VISIBLE_FIXED_ADS,
    topRotationMs: DEFAULT_TOP_FIXED_AD_ROTATION_MS,
    bottomRotationMs: DEFAULT_BOTTOM_FIXED_AD_ROTATION_MS,
  };
  const signature = JSON.stringify({ units, fixedConfig, social: socialScripts });
  if (signature === fixedAdSignature) return;
  fixedAdSignature = signature;
  startFixedAdRotation(units, fixedConfig);
  startSocialAdRotation(socialScripts);
}

window.addEventListener('six-houses-config-ready', loadConfiguredAds);
if ('requestIdleCallback' in window) window.requestIdleCallback(loadConfiguredAds, { timeout: 2500 });
else window.setTimeout(loadConfiguredAds, 1800);
