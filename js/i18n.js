(function () {
  const body = document.body;
  if (!body) return;
  body.classList.add('security-check-pending');
  const style = document.createElement('style');
  style.textContent = [
    '.security-gate{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:24px;overflow:auto;color:#e7f4f0;background:radial-gradient(circle at 50% 25%,rgba(118,224,195,.09),transparent 38%),radial-gradient(circle at 50% 100%,rgba(215,181,109,.08),transparent 42%),#03090c}',
    '.security-gate[hidden]{display:none!important}',
    '.security-card{width:min(100%,390px);padding:34px 24px 26px;text-align:center;border:1px solid rgba(215,181,109,.28);border-radius:28px;background:linear-gradient(145deg,rgba(9,29,32,.97),rgba(3,12,16,.985));box-shadow:0 24px 70px rgba(0,0,0,.48),0 0 42px rgba(215,181,109,.08),inset 0 1px rgba(255,255,255,.07)}',
    '.security-icon{width:92px;height:92px;display:grid;place-items:center;margin:0 auto 18px;color:#e4c27a;border:1px solid rgba(215,181,109,.28);border-radius:30px;background:radial-gradient(circle,rgba(215,181,109,.16),rgba(118,224,195,.04) 62%,transparent 70%);box-shadow:0 0 30px rgba(215,181,109,.12),inset 0 0 22px rgba(118,224,195,.05);animation:securityShieldFloat 3.6s ease-in-out infinite}',
    '.security-icon svg{width:58px;height:58px}',
    '.security-eyebrow{color:#76e0c3;font-size:9px;font-weight:900;letter-spacing:2.2px}',
    '.security-card h1{margin-top:10px;color:#f1f7f4;font-size:25px;font-weight:900}',
    '.security-card p{margin:12px auto 0;max-width:295px;color:#a9c2c2;font-size:12px;line-height:1.9}',
    '.security-retry{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:24px;padding:14px 16px;border:1px solid rgba(118,224,195,.35);border-radius:14px;color:#092019;background:linear-gradient(100deg,#76e0c3,#c2f0df);font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 25px rgba(118,224,195,.14);transition:transform .2s ease,filter .2s ease}',
    '.security-retry:hover{filter:brightness(1.06);transform:translateY(-1px)}',
    '.security-retry:active{transform:scale(.98)}',
    '.security-retry svg{width:18px;height:18px}',
    '@keyframes securityShieldFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    'body.security-check-pending>:not(#securityGate):not(#telegramOnlyGate):not(#accountBlockedGate):not(.security-ad-bait){visibility:hidden!important;pointer-events:none!important}',
    'body.security-blocked>:not(#securityGate){display:none!important}',
    'body.security-blocked{overflow:hidden!important;background:#03090c!important}'
  ].join('');
  document.head.appendChild(style);
  const gate = document.createElement('div');
  gate.className = 'security-gate';
  gate.id = 'securityGate';
  gate.hidden = true;
  gate.setAttribute('aria-live', 'assertive');
  gate.innerHTML = '<div class="security-card" role="alertdialog" aria-labelledby="securityTitle" aria-describedby="securityMessage"><div class="security-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M32 6 52 14v15c0 13.2-8.3 23.8-20 29C20.3 52.8 12 42.2 12 29V14L32 6Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m23 32 6 6 12-13" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="security-eyebrow">SECURITY CHECK</span><h1 id="securityTitle">تم إيقاف التطبيق</h1><p id="securityMessage"></p><button class="security-retry" id="securityRetry" type="button"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 1 0 1 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 5v6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>إعادة التحقق</span></button></div>';
  body.insertBefore(gate, body.firstChild);
  const securityScript = document.createElement('script');
  securityScript.src = 'js/security.js?v=20260914-security1';
  securityScript.async = false;
  document.head.appendChild(securityScript);
}());

/* =========================================================
   ستة بيوت — شبكة اختيار (بدون معركة داخلها) + ساحة معركة مفتوحة واحدة
   تمتد لأسفل الشاشة، الزومبي يطلع من أسفلها والبيت النشط يطلق عليه
   ========================================================= */
/* ===================== نظام اللغة — يكتشف لغة المتصفح تلقائيًا (عربي/إنجليزي) ===================== */
const LANG = (navigator.language || navigator.userLanguage || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
document.title = LANG === 'ar' ? 'ستة بيوت' : 'Six Houses';

const I18N = {
  ar: {
    closeBtn: 'إغلاق',
    lockedBtn: 'غير متاح بعد',
    activeBtn: 'مفعّل الآن',
    activateBtn: 'تفعيل هذا البيت',
    statusActive: '✅ مفعّل حاليًا',
    statusUnlocked: '🔓 مفتوحة',
    statusLocked: (label, prog) => `🔒 مغلقة — تحتاج ${label} (${prog})`,
    unlockedToast: (name) => `🎉 تم فتح ${name}!`,
    oneReferral: 'إحالة واحدة',
    referralsN: (n) => `${n} إحالة`,
    adsN: (n) => `${n} إعلان`,
    houseAdsLabel: 'إعلانات هذا البيت',
    houseAdsProgress: (have, need) => `${have} / ${need} إعلان`,
    shareForUnlock: 'شارك لفتح البيت',
    depositN: (n) => `إيداع $${n}`,
    shareText: 'العب ستة بيوت واربح USDT حقيقي! 🏰🧟',
    walletTitle: 'المحفظة',
    walletKicker: 'مركز المكافآت',
    walletBalanceHint: 'المتاح للسحب',
    walletProgress: (n) => `الحد الأدنى ${n}`,
    walletSpeedLabel: 'معالجة آمنة',
    walletSpeedValue: 'جاهز للطلب',
    walletNetworkLabel: 'الشبكة',
    copyAddress: 'نسخ',
    copiedAddress: 'تم نسخ العنوان',
    invalidAddress: 'تحقق من عنوان TON وأعد المحاولة',
    walletSecurityNote: 'لا تشارك عبارة الاسترداد أو المفاتيح الخاصة. نستخدم عنوان TON للسحب فقط.',
    connectWallet: 'ربط محفظة TON',
    connectingWallet: 'جارٍ تحميل المحافظ...',
    walletConnectFailed: 'تعذر فتح محافظ TON، حاول مرة أخرى',
    disconnectWallet: 'فصل المحفظة',
    walletNotConnected: 'لم يتم ربط محفظة بعد',
    walletConnected: (address) => `متصلة: ${address}`,
    walletSdkUnavailable: 'تعذر تحميل TON Connect',
    connectWalletFirst: 'اربط محفظة TON أولًا',
    walletBalanceLabel: 'الرصيد الحالي',
    walletDivider: 'طلب سحب',
    walletAddressLabel: 'عنوان محفظة TON',
    tonAddressPlaceholder: 'مثال: UQAbC123...',
    minWithdrawNote: (n) => `الحد الأدنى للسحب: $${n}`,
    withdrawBtn: 'سحب',
    watchAdBtn: 'مشاهدة إعلان',
    needAddress: 'أدخل عنوان محفظة TON',
    notEnoughBalance: (min) => `الرصيد غير كافٍ — الحد الأدنى $${min}`,
    withdrawSent: 'تم إرسال طلب السحب ✅',
    noAdAvailable: 'لا يوجد إعلان متاح حاليًا',
    collectCoin: 'اجمع العملة',
    telegramOnlyCollect: 'لجمع العملات، افتح التطبيق من داخل Telegram',
    telegramOnlyAd: 'لمشاهدة الإعلان واحتساب المكافأة، افتح التطبيق من داخل Telegram',
    guestWithdraw: 'السحب متاح من داخل تطبيق Telegram فقط',
    accountBlockedTitle: 'تم حظر حسابك',
    accountBlockedMessage: 'تم حظر هذا الحساب من استخدام التطبيق. إذا كنت تعتقد أن هذا حدث بالخطأ، تواصل مع الإدارة.',
    arenaCaption: 'منطقة تعدين العملات',
  },
  en: {
    closeBtn: 'Close',
    lockedBtn: 'Not available yet',
    activeBtn: 'Currently active',
    activateBtn: 'Activate this castle',
    statusActive: '✅ Currently active',
    statusUnlocked: '🔓 Unlocked',
    statusLocked: (label, prog) => `🔒 Locked — needs ${label} (${prog})`,
    unlockedToast: (name) => `🎉 ${name} unlocked!`,
    oneReferral: '1 referral',
    referralsN: (n) => `${n} referrals`,
    adsN: (n) => `${n} ads`,
    houseAdsLabel: 'This house ads',
    houseAdsProgress: (have, need) => `${have} / ${need} ads`,
    shareForUnlock: 'Share to unlock',
    depositN: (n) => `Deposit $${n}`,
    shareText: 'Play Six Houses and earn real USDT! 🏰🧟',
    walletTitle: 'Wallet',
    walletKicker: 'Rewards center',
    walletBalanceHint: 'Available to withdraw',
    walletProgress: (n) => `Minimum ${n}`,
    walletSpeedLabel: 'Secure processing',
    walletSpeedValue: 'Ready to request',
    walletNetworkLabel: 'Network',
    copyAddress: 'Copy',
    copiedAddress: 'Address copied',
    invalidAddress: 'Check your TON address and try again',
    walletSecurityNote: 'Never share your recovery phrase or private keys. Only your TON address is used for withdrawals.',
    connectWallet: 'Connect TON wallet',
    connectingWallet: 'Loading wallets...',
    walletConnectFailed: 'Could not open TON wallets, try again',
    disconnectWallet: 'Disconnect wallet',
    walletNotConnected: 'No wallet connected yet',
    walletConnected: (address) => `Connected: ${address}`,
    walletSdkUnavailable: 'TON Connect could not load',
    connectWalletFirst: 'Connect a TON wallet first',
    walletBalanceLabel: 'Current balance',
    walletDivider: 'Withdraw request',
    walletAddressLabel: 'TON wallet address',
    tonAddressPlaceholder: 'e.g. UQAbC123...',
    minWithdrawNote: (n) => `Minimum withdrawal: $${n}`,
    withdrawBtn: 'Withdraw',
    watchAdBtn: 'Watch Ad',
    needAddress: 'Enter your TON wallet address',
    notEnoughBalance: (min) => `Insufficient balance — minimum $${min}`,
    withdrawSent: 'Withdrawal request sent ✅',
    noAdAvailable: 'No ad available right now',
    collectCoin: 'Collect coin',
    telegramOnlyCollect: 'Open the app inside Telegram to collect coins',
    telegramOnlyAd: 'Open the app inside Telegram to watch ads and receive rewards',
    guestWithdraw: 'Withdrawals are available inside the Telegram app only',
    accountBlockedTitle: 'Your account has been blocked',
    accountBlockedMessage: 'This account has been blocked from using the app. Contact the administration if you believe this is a mistake.',
    arenaCaption: 'Coin mining area',
  },
};
const T = I18N[LANG];
const HERO_COPY = LANG === 'ar' ? { eyebrow: 'ساحة استراتيجية', title: 'ستة بيوت', subtitle: 'اختر قلعتك، طوّر ميزتك، واجمع مكافآتك بهدوء.' } : { eyebrow: 'Strategic arena', title: 'Six Houses', subtitle: 'Choose your castle, unlock its edge, and collect your rewards.' };
document.getElementById('heroEyebrow').textContent = HERO_COPY.eyebrow;
document.getElementById('heroTitle').textContent = HERO_COPY.title;
document.getElementById('heroSubtitle').textContent = HERO_COPY.subtitle;
document.getElementById('arenaCaption').textContent = T.arenaCaption;
