/* ===================== محرّك تشغيل إعلانات 320×50 ===================== */
function renderAdSlot(containerId, key) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.style.width = '320px';
  iframe.style.height = '50px';
  iframe.style.border = '0';
  iframe.style.overflow = 'hidden';
  iframe.scrolling = 'no';
  container.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    '<script>atOptions = {"key":"' + key + '","format":"iframe","height":50,"width":320,"params":{}};<\/script>' +
    '<script src="https://interventioncopiedloitering.com/' + key + '/invoke.js"><\/script>'
  );
  doc.close();
}

/* الأكواد الثابتة (أعلى + أسفل) */
const AD_TOP_KEYS = [
  'b895987c82805b8778a34f54911e8de0',
  'ab4615d3d759a81e9b876abbcebaf690',
  '3b49398bb9242d548c0464f244b621fa'
];
const AD_BOTTOM_INITIAL_KEYS = [
  'b3570e82f7fb6c462dfdfded816f1576',
  'de29a44d70992e967ae5d20275e77fab',
  '280eab7c354ed87595a376b2f5e270cb'
];
/* الأكواد المتبقية — تُستخدم في تحديث الثلاثة النشطين أسفل الصفحة كل 5 ثواني عشوائيًا */
const AD_ROTATE_POOL = [
  'd47f719464108005a03a03e6d49fba1a',
  '04bcf6532017b6790ab2ddac95a5621d',
  '8c0574e870e5a3843e89d947bd38aaff',
  '9f6fe4084cb3d8a8eb4d8246ee57ed25'
];

const AD_TOP_IDS = ['adTop1', 'adTop2', 'adTop3'];
const AD_BOTTOM_IDS = ['adBottom1', 'adBottom2', 'adBottom3'];
const AD_ACTIVE_IDS = AD_TOP_IDS.concat(AD_BOTTOM_IDS);

function randomAdKey() {
  return AD_ROTATE_POOL[Math.floor(Math.random() * AD_ROTATE_POOL.length)];
}

/* تحميل أولي */
AD_TOP_IDS.forEach((id, i) => renderAdSlot(id, AD_TOP_KEYS[i]));
AD_BOTTOM_IDS.forEach((id, i) => renderAdSlot(id, AD_BOTTOM_INITIAL_KEYS[i]));

/* تحديث الستة (فوق وتحت) كل 5 ثواني بشكل عشوائي */
setInterval(() => {
  AD_ACTIVE_IDS.forEach(id => renderAdSlot(id, randomAdKey()));
}, 5000);


/* ===================== Social Ads متسلسلة ومعزولة ===================== */
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

function clearSocialAdFrame() {
  clearTimeout(socialAdHideTimer);
  if (socialAdSlot) socialAdSlot.replaceChildren();
  socialAdStage?.classList.remove('is-visible');
}

function showNextSocialAd() {
  if (!socialAdStage || !socialAdSlot) return;
  clearSocialAdFrame();
  const source = SOCIAL_AD_SOURCES[socialAdIndex % SOCIAL_AD_SOURCES.length];
  socialAdIndex += 1;
  const frame = document.createElement('iframe');
  frame.className = 'social-ad-frame';
  frame.title = 'Social advertisement';
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('aria-hidden', 'true');
  frame.srcdoc = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden;background:transparent"><script src="' + source + '"><\/script></body></html>';
  socialAdSlot.appendChild(frame);
  requestAnimationFrame(() => socialAdStage.classList.add('is-visible'));
  socialAdHideTimer = setTimeout(() => {
    socialAdStage.classList.remove('is-visible');
    frame.remove();
    socialAdShowTimer = setTimeout(showNextSocialAd, SOCIAL_AD_GAP_MS);
  }, SOCIAL_AD_VISIBLE_MS);
}

/* 320×50 يعمل بالنظام القديم؛ هنا فقط يتم تدوير Social Ads واحدًا تلو الآخر. */
setTimeout(showNextSocialAd, 900);
