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
