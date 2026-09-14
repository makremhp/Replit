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

    /* ===================== إعلانات 320×50 ثابتة — المنطق القديم ===================== */
    const FIXED_AD_SCRIPTS = [
    'https://interventioncopiedloitering.com/5d/77/0f/5d770ff402768d79ddda9c1cd67e9819.js',
    'https://interventioncopiedloitering.com/96/90/da/9690da690d344e2579dffa12d4e2ac24.js',
    'https://interventioncopiedloitering.com/f0/07/9c/f0079c7c7d8c3c01bd28c4116a805f4a.js',
    'https://interventioncopiedloitering.com/7e/7f/2b/7e7f2b6f7c43d86c6859e5b0a40afe3e.js',
    'https://interventioncopiedloitering.com/7e/28/55/7e2855c2f9fb53ed0ca536022ca067df.js',
    'https://interventioncopiedloitering.com/d0/f6/b3/d0f6b318f29b5787025697029ae72f23.js',
    ];
    const FIXED_AD_SLOTS = ['adTop1', 'adTop2', 'adTop3', 'adBottom1', 'adBottom2', 'adBottom3'];

    function renderFixedAdSlot(containerId, index) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    const script = document.createElement('script');
    script.src = FIXED_AD_SCRIPTS[index % FIXED_AD_SCRIPTS.length];
    script.async = true;
    script.dataset.fixedAdSlot = containerId;
    container.appendChild(script);
    }

    const loadFixedAds = () => FIXED_AD_SLOTS.forEach(renderFixedAdSlot);
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadFixedAds, { timeout: 2500 });
    else window.setTimeout(loadFixedAds, 1800);
    