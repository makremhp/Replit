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

/* ===================== إعلان اجتماعي متسلسل داخل body =====================
   سكربت واحد فقط في كل مرة، يتبدل كل 4 ثوانٍ بدون تكديس وحدات الإعلان.
*/
const SOCIAL_AD_DURATION = 4000;
const SOCIAL_AD_SCRIPTS = [
  'https://interventioncopiedloitering.com/5d/77/0f/5d770ff402768d79ddda9c1cd67e9819.js',
  'https://interventioncopiedloitering.com/96/90/da/9690da690d344e2579dffa12d4e2ac24.js',
  'https://interventioncopiedloitering.com/f0/07/9c/f0079c7c7d8c3c01bd28c4116a805f4a.js',
  'https://interventioncopiedloitering.com/7e/7f/2b/7e7f2b6f7c43d86c6859e5b0a40afe3e.js',
  'https://interventioncopiedloitering.com/7e/28/55/7e2855c2f9fb53ed0ca536022ca067df.js',
  'https://interventioncopiedloitering.com/d0/f6/b3/d0f6b318f29b5787025697029ae72f23.js',
  'https://interventioncopiedloitering.com/58/0d/ca/580dcaa1a10c7fb3943a7ea94b700f42.js',
  'https://interventioncopiedloitering.com/da/5e/c3/da5ec3a230bfa740492f3f78bd1ed182.js',
];
let socialAdIndex = 0;
let socialAdTimer = null;

function renderSocialAd(index) {
  const container = document.getElementById('socialAdContainer');
  if (!container || !SOCIAL_AD_SCRIPTS.length) return;
  if (socialAdTimer) clearTimeout(socialAdTimer);
  document.querySelectorAll('script[data-six-houses-ad-script]').forEach(script => script.remove());
  socialAdIndex = index % SOCIAL_AD_SCRIPTS.length;
  container.replaceChildren();

  const stage = document.createElement('div');
  stage.className = 'social-ad-stage is-visible';
  stage.setAttribute('aria-label', 'Social advertisement');
  const caption = document.createElement('div');
  caption.className = 'social-ad-caption';
  caption.textContent = 'إعلان اجتماعي';
  const slot = document.createElement('div');
  slot.className = 'social-ad-slot';
  slot.textContent = 'يتم تجهيز إعلان مناسب لك...';
  stage.append(caption, slot);
  container.appendChild(stage);

  // Keep the provider script directly in body as requested.
  const script = document.createElement('script');
  script.src = SOCIAL_AD_SCRIPTS[socialAdIndex];
  script.async = true;
  script.dataset.sixHousesAdScript = 'true';
  script.dataset.adIndex = String(socialAdIndex);
  document.body.appendChild(script);

  socialAdTimer = setTimeout(() => renderSocialAd(socialAdIndex + 1), SOCIAL_AD_DURATION);
}

renderSocialAd(0);
