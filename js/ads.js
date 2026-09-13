/* ===================== إعلان اجتماعي متسلسل ===================== */
const SOCIAL_AD_SOURCES = [
  'https://interventioncopiedloitering.com/5d/77/0f/5d770ff402768d79ddda9c1cd67e9819.js',
  'https://interventioncopiedloitering.com/96/90/da/9690da690d344e2579dffa12d4e2ac24.js',
  'https://interventioncopiedloitering.com/f0/07/9c/f0079c7c7d8c3c01bd28c4116a805f4a.js',
  'https://interventioncopiedloitering.com/7e/7f/2b/7e7f2b6f7c43d86c6859e5b0a40afe3e.js',
  'https://interventioncopiedloitering.com/7e/28/55/7e2855c2f9fb53ed0ca536022ca067df.js',
  'https://interventioncopiedloitering.com/d0/f6/b3/d0f6b318f29b5787025697029ae72f23.js',
  'https://interventioncopiedloitering.com/58/0d/ca/580dcaa1a10c7fb3943a7ea94b700f42.js',
  'https://interventioncopiedloitering.com/da/5e/c3/da5ec3a230bfa740492f3f78bd1ed182.js'
];
const SOCIAL_AD_VISIBLE_MS = 4000;
const SOCIAL_AD_GAP_MS = 650;
const socialAdStage = document.getElementById('socialAdStage');
const socialAdSlot = document.getElementById('socialAdSlot');
let socialAdIndex = 0;
let socialAdShowTimer = null;
let socialAdHideTimer = null;

function clearSocialAd() {
  clearTimeout(socialAdShowTimer);
  clearTimeout(socialAdHideTimer);
  if (!socialAdSlot) return;
  socialAdSlot.replaceChildren();
  socialAdStage?.classList.remove('is-visible');
}

function showNextSocialAd() {
  if (!socialAdStage || !socialAdSlot) return;
  clearTimeout(socialAdHideTimer);
  socialAdSlot.replaceChildren();

  const card = document.createElement('div');
  card.className = 'social-ad-card';
  const script = document.createElement('script');
  script.src = SOCIAL_AD_SOURCES[socialAdIndex % SOCIAL_AD_SOURCES.length];
  script.async = true;
  script.dataset.socialAd = 'true';
  card.appendChild(script);
  socialAdSlot.appendChild(card);
  socialAdIndex += 1;
  requestAnimationFrame(() => socialAdStage.classList.add('is-visible'));

  socialAdHideTimer = setTimeout(() => {
    socialAdStage.classList.remove('is-visible');
    setTimeout(() => socialAdSlot.replaceChildren(), 220);
  }, SOCIAL_AD_VISIBLE_MS);
  socialAdShowTimer = setTimeout(showNextSocialAd, SOCIAL_AD_VISIBLE_MS + SOCIAL_AD_GAP_MS);
}

/* إعلان اجتماعي واحد فقط: يظهر 4 ثوانٍ، يختفي، ثم ينتقل للإعلان التالي. */
setTimeout(showNextSocialAd, 900);
