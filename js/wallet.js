/* ===================== المشاركة ===================== */
const BOT_USERNAME = 'YOUR_BOT_USERNAME';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;
document.getElementById('shareBtn').addEventListener('click', () => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(T.shareText)}`;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) window.Telegram.WebApp.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank', 'noopener');
});

/* ===================== محفظة TON Connect ===================== */
const MIN_WITHDRAW = 5;
const TON_MANIFEST_URL = 'https://replit-liart.vercel.app/tonconnect-manifest.json';
const walletPage = document.getElementById('walletPage');
const walletTitleText = document.getElementById('walletTitleText');
const walletMinNote = document.getElementById('walletMinNote');
const tonAddressInput = document.getElementById('tonAddressInput');
const withdrawBtn = document.getElementById('withdrawBtn');
const watchAdBtn = document.getElementById('watchAdBtn');
const copyAddressBtn = document.getElementById('copyAddressBtn');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
const connectWalletBtnText = document.getElementById('connectWalletBtnText');
const disconnectWalletBtnText = document.getElementById('disconnectWalletBtnText');
const walletConnectionStatusText = document.getElementById('walletConnectionStatusText');
const walletConnectionDot = document.getElementById('walletConnectionDot');
let tonConnectUI = null;
let connectedTonAddress = '';

function renderWalletProgress() {
  const fill = document.getElementById('walletProgressFill');
  const progressText = document.getElementById('walletProgressText');
  if (!fill || !progressText) return;
  fill.style.width = Math.min(100, (State.balance / MIN_WITHDRAW) * 100) + '%';
  progressText.textContent = T.walletProgress(MIN_WITHDRAW);
}

function shortTonAddress(address) {
  return address.length > 18 ? address.slice(0, 8) + '…' + address.slice(-7) : address;
}

function applyTonWallet(wallet) {
  connectedTonAddress = wallet?.account?.address || '';
  const connected = Boolean(connectedTonAddress);
  tonAddressInput.value = connectedTonAddress;
  tonAddressInput.classList.toggle('is-connected', connected);
  connectWalletBtn.hidden = connected;
  disconnectWalletBtn.hidden = !connected;
  walletConnectionDot.classList.toggle('is-connected', connected);
  walletConnectionStatusText.textContent = connected ? T.walletConnected(shortTonAddress(connectedTonAddress)) : T.walletNotConnected;
}

function initTonConnect() {
  if (tonConnectUI) return tonConnectUI;
  if (!window.TON_CONNECT_UI || !window.TON_CONNECT_UI.TonConnectUI) {
    walletConnectionStatusText.textContent = T.walletSdkUnavailable;
    return null;
  }
  tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({ manifestUrl: TON_MANIFEST_URL });
  tonConnectUI.onStatusChange(wallet => applyTonWallet(wallet));
  applyTonWallet(tonConnectUI.wallet);
  return tonConnectUI;
}

async function connectTonWallet() {
  const ui = initTonConnect();
  if (!ui) return showToast(T.walletSdkUnavailable);
  await ui.openModal();
}

connectWalletBtn.addEventListener('click', connectTonWallet);
disconnectWalletBtn.addEventListener('click', async () => {
  if (tonConnectUI) await tonConnectUI.disconnect();
  applyTonWallet(null);
});

function openWalletPage() {
  initTonConnect();
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
  connectWalletBtnText.textContent = T.connectWallet;
  disconnectWalletBtnText.textContent = T.disconnectWallet;
  copyAddressBtn.textContent = T.copyAddress;
  withdrawBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${T.withdrawBtn}</span>`;
  watchAdBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/></svg><span>${T.watchAdBtn}</span>`;
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
copyAddressBtn.addEventListener('click', async () => {
  const address = connectedTonAddress;
  if (!address) return showToast(T.connectWalletFirst);
  try { await navigator.clipboard.writeText(address); showToast(T.copiedAddress); }
  catch (_) { tonAddressInput.select(); showToast(T.copyAddress); }
});

withdrawBtn.addEventListener('click', () => {
  const address = connectedTonAddress;
  if (!address) return showToast(T.connectWalletFirst);
  if (State.balance < MIN_WITHDRAW) return showToast(T.notEnoughBalance(MIN_WITHDRAW));
  /* واجهة السحب جاهزة؛ التنفيذ الحقيقي يحتاج endpoint آمن في الباك إند. */
  showToast(T.withdrawSent);
});
watchAdBtn.addEventListener('click', () => showToast(T.noAdAvailable));
