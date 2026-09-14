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
const DEFAULT_FIXED_AD_ROTATION_MS = 5000;
const SOCIAL_AD_DURATION_MS = 5000;
const AD_SLOT_HEIGHT = 50;
const AD_SLOT_GAP = 5;
let fixedAdSignature = '';
let fixedAdOffset = 0;
let fixedAdRotationTimer = null;
let socialAdRotationTimer = null;
let socialAdRunId = 0;

function configuredFixedAdUnits() {
  const units = typeof State !== 'undefined' ? State.config?.fixedAdUnits : [];
  return Array.isArray(units) ? units.filter(unit => unit && unit.key && unit.src) : [];
}

function configuredSocialAdScripts() {
  const scripts = typeof State !== 'undefined' ? State.config?.socialAdScripts : [];
  return Array.isArray(scripts) ? scripts.filter(Boolean) : [];
}

function renderMissingAdSlot(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  container.style.height = `${AD_SLOT_HEIGHT}px`;
  container.style.minHeight = '0';
  const placeholder = document.createElement('div');
  placeholder.className = 'ad-320-slot ad-slot-placeholder';
  placeholder.textContent = 'Ad code is not configured';
  container.appendChild(placeholder);
}

function setAdSideHeight(container, visibleCount) {
  const contentHeight = visibleCount > 0
    ? (visibleCount * AD_SLOT_HEIGHT) + ((visibleCount - 1) * AD_SLOT_GAP)
    : 0;
  container.style.height = `${contentHeight}px`;
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

function renderFixedAdSide(containerId, units, offset, configuredCount) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const visibleCount = Math.min(units.length, normalizeVisibleAdCount(configuredCount));
  setAdSideHeight(container, visibleCount);
  container.replaceChildren();
  for (let index = 0; index < visibleCount; index += 1) {
    const unit = units[(offset + index) % units.length];
    const slot = document.createElement('div');
    slot.className = 'ad-320-slot';
    slot.style.height = `${AD_SLOT_HEIGHT}px`;
    slot.style.minHeight = `${AD_SLOT_HEIGHT}px`;
    slot.style.flex = `0 0 ${AD_SLOT_HEIGHT}px`;
    slot.dataset.adIndex = String(index);
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
    slot.append(configScript, providerScript);
    container.appendChild(slot);
  }
}

function stopFixedAdRotation() {
  if (fixedAdRotationTimer) {
    window.clearInterval(fixedAdRotationTimer);
    fixedAdRotationTimer = null;
  }
}

function startFixedAdRotation(units, config = {}) {
  stopFixedAdRotation();
  const topContainer = document.getElementById('adTopAds');
  const bottomContainer = document.getElementById('adBottomAds');
  if (!topContainer || !bottomContainer) return;
  if (!units.length) {
    renderMissingAdSlot('adTopAds');
    renderMissingAdSlot('adBottomAds');
    return;
  }

  const topVisibleCount = normalizeVisibleAdCount(config.topVisibleCount);
  const bottomVisibleCount = normalizeVisibleAdCount(config.bottomVisibleCount);
  const rotationMs = normalizeRotationMs(
    config.rotationMs ?? config.topRotationMs,
    DEFAULT_FIXED_AD_ROTATION_MS
  );
  fixedAdOffset = 0;

  // Both sides render and rotate from one timer and one offset.
  renderFixedAdSide('adTopAds', units, fixedAdOffset, topVisibleCount);
  renderFixedAdSide('adBottomAds', units, fixedAdOffset, bottomVisibleCount);

  if (units.length > 1) {
    fixedAdRotationTimer = window.setInterval(() => {
      fixedAdOffset = (fixedAdOffset + 1) % units.length;
      renderFixedAdSide('adTopAds', units, fixedAdOffset, topVisibleCount);
      renderFixedAdSide('adBottomAds', units, fixedAdOffset, bottomVisibleCount);
    }, rotationMs);
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
  const units = configuredFixedAdUnits();
  const socialScripts = configuredSocialAdScripts();
  const fixedConfig = {
    topVisibleCount: State.config?.fixedAdTopCount,
    bottomVisibleCount: State.config?.fixedAdBottomCount,
    rotationMs: State.config?.fixedAdRotationMs ?? State.config?.fixedAdTopRotationMs,
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
