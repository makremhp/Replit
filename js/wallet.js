/* ===================== المشاركة ===================== */
const BOT_USERNAME = 'YOUR_BOT_USERNAME';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;
document.getElementById('shareBtn').addEventListener('click', () => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(T.shareText)}`;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) window.Telegram.WebApp.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank', 'noopener');
});

/* ===================== محفظة احترافية ===================== */
const MIN_WITHDRAW = 5;
const walletPage = document.getElementById('walletPage');
const walletTitleText = document.getElementById('walletTitleText');
const walletMinNote = document.getElementById('walletMinNote');
const tonAddressInput = document.getElementById('tonAddressInput');
const withdrawBtn = document.getElementById('withdrawBtn');
const watchAdBtn = document.getElementById('watchAdBtn');
const copyAddressBtn = document.getElementById('copyAddressBtn');

function renderWalletProgress() {
  const fill = document.getElementById('walletProgressFill');
  const progressText = document.getElementById('walletProgressText');
  if (!fill || !progressText) return;
  const progress = Math.min(100, (State.balance / MIN_WITHDRAW) * 100);
  fill.style.width = progress + '%';
  progressText.textContent = T.walletProgress(MIN_WITHDRAW);
}

function openWalletPage() {
  document.getElementById('walletKicker').textContent = T.walletKicker;
  walletTitleText.textContent = T.walletTitle;
  document.getElementById('walletBalanceLabel').textContent = T.walletBalanceLabel;
  document.getElementById('walletBalanceHint').textContent = T.walletBalanceHint;
  document.getElementById('walletSpeedLabel').textContent = T.walletSpeedLabel;
  document.getElementById('walletSpeedValue').textContent = T.walletSpeedValue;
  document.getElementById('walletNetworkLabel').textContent = T.walletNetworkLabel;
  document.getElementById('walletDividerLabel').textContent = T.walletDivider;
  document.getElementById('walletAddressLabel').textContent = T.walletAddressLabel;
  document.getElementById('walletMinNote').textContent = T.minWithdrawNote(MIN_WITHDRAW);
  document.getElementById('walletSecurityNote').textContent = T.walletSecurityNote;
  tonAddressInput.placeholder = T.tonAddressPlaceholder;
  tonAddressInput.value = localStorage.getItem('sh_ton_address') || '';
  withdrawBtn.innerHTML = `<span class="ic">↗</span><span>${T.withdrawBtn}</span>`;
  watchAdBtn.innerHTML = `<span class="ic">▶</span><span>${T.watchAdBtn}</span>`;
  copyAddressBtn.textContent = T.copyAddress;
  renderBalance();
  renderWalletProgress();
  walletPage.classList.add('show');
  walletPage.setAttribute('aria-hidden', 'false');
}

function closeWalletPage() {
  walletPage.classList.remove('show');
  walletPage.setAttribute('aria-hidden', 'true');
}

document.getElementById('walletBtn').addEventListener('click', openWalletPage);
document.getElementById('walletBackBtn').addEventListener('click', closeWalletPage);
tonAddressInput.addEventListener('input', () => localStorage.setItem('sh_ton_address', tonAddressInput.value.trim()));
copyAddressBtn.addEventListener('click', async () => {
  const address = tonAddressInput.value.trim();
  if (!address) return showToast(T.needAddress);
  try {
    await navigator.clipboard.writeText(address);
    showToast(T.copiedAddress);
  } catch (_) {
    tonAddressInput.select();
    showToast(T.copyAddress);
  }
});

withdrawBtn.addEventListener('click', () => {
  const address = tonAddressInput.value.trim();
  if (!address) return showToast(T.needAddress);
  if (!/^(EQ|UQ)[A-Za-z0-9_-]{46,48}$/.test(address)) return showToast(T.invalidAddress);
  if (State.balance < MIN_WITHDRAW) return showToast(T.notEnoughBalance(MIN_WITHDRAW));
  /* واجهة السحب جاهزة؛ ربط التنفيذ الحقيقي يحتاج endpoint آمن في الباك إند. */
  showToast(T.withdrawSent);
});

watchAdBtn.addEventListener('click', () => showToast(T.noAdAvailable));
