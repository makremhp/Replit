/* ===================== زر المشاركة (أقصى يمين الشاشة) — يفتح مشاركة تيليجرام ===================== */
const BOT_USERNAME = 'YOUR_BOT_USERNAME'; // ⚠️ استبدل هذا باسم يوزر البوت الحقيقي بدون @
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;
document.getElementById('shareBtn').addEventListener('click', () => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(T.shareText)}`;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
});

/* ===================== صفحة المحفظة (سحب) ===================== */
const MIN_WITHDRAW = 5;
const walletPage = document.getElementById('walletPage');
const walletTitleText = document.getElementById('walletTitleText');
const walletMinNote = document.getElementById('walletMinNote');
const tonAddressInput = document.getElementById('tonAddressInput');
const withdrawBtn = document.getElementById('withdrawBtn');
const watchAdBtn = document.getElementById('watchAdBtn');

function openWalletPage() {
  walletTitleText.textContent = T.walletTitle;
  document.getElementById('walletBalanceLabel').textContent = T.walletBalanceLabel;
  document.getElementById('walletDividerLabel').textContent = T.walletDivider;
  document.getElementById('walletAddressLabel').textContent = T.walletAddressLabel;
  walletMinNote.textContent = T.minWithdrawNote(MIN_WITHDRAW);
  tonAddressInput.placeholder = T.tonAddressPlaceholder;
  withdrawBtn.innerHTML = `<span class="ic">📤</span><span>${T.withdrawBtn}</span>`;
  watchAdBtn.innerHTML = `<span class="ic">▶</span><span>${T.watchAdBtn}</span>`;
  renderBalance();
  walletPage.classList.add('show');
}
function closeWalletPage() { walletPage.classList.remove('show'); }

document.getElementById('walletBtn').addEventListener('click', openWalletPage);
document.getElementById('walletBackBtn').addEventListener('click', closeWalletPage);

withdrawBtn.addEventListener('click', () => {
  const address = tonAddressInput.value.trim();
  if (!address) { showToast(T.needAddress); return; }
  if (State.balance < MIN_WITHDRAW) { showToast(T.notEnoughBalance(MIN_WITHDRAW)); return; }
  /* ⚠️ نقطة ربط: نادِ الباك إند الحقيقي هون لتنفيذ عملية سحب فعلية عبر شبكة TON
     مثال: fetch('/api/withdraw', { method:'POST', body: JSON.stringify({ address, amount: State.balance }) }) */
  showToast(T.withdrawSent);
});

watchAdBtn.addEventListener('click', () => {
  /* ⚠️ نقطة ربط: استدعِ هون SDK الإعلان المكافأ (Rewarded Ad) الحقيقي تبعك
     مثال: show_XXXXXXX().then(() => addBalance(REWARD_AMOUNT, 0, 0)) */
  showToast(T.noAdAvailable);
});
