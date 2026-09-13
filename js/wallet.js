/* ===================== المشاركة ===================== */
const BOT_USERNAME = 'YOUR_BOT_USERNAME';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

document.getElementById('shareBtn').addEventListener('click', () => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(T.shareText)}`;
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank', 'noopener');
  }
});

/* ===================== اتصال TON Connect — تنفيذ جديد ===================== */
let MIN_WITHDRAW = 0.01;
const TON_SDK_URL = 'https://unpkg.com/@tonconnect/ui@2.2.0/dist/tonconnect-ui.min.js';
const TON_MANIFEST_URL = new URL('tonconnect-manifest.json', document.baseURI).href;

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

let tonConnectUi = null;
let tonConnectInitPromise = null;
let tonSdkLoadPromise = null;
let connectedTonAddress = '';

function getTonConnectUiClass() {
  return window.TON_CONNECT_UI?.TonConnectUI || window.TonConnectUI || null;
}

function setConnectionStatus(message, connected = false) {
  walletConnectionStatusText.textContent = message;
  walletConnectionDot.classList.toggle('is-connected', connected);
}

function shortTonAddress(address) {
  return address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-7)}` : address;
}

function renderConnectedWallet(wallet) {
  connectedTonAddress = wallet?.account?.address || '';
  const connected = Boolean(connectedTonAddress);
  tonAddressInput.value = connectedTonAddress;
  tonAddressInput.classList.toggle('is-connected', connected);
  if (connected && State.tonAddress !== connectedTonAddress) {
    State.tonAddress = connectedTonAddress;
    saveState();
  }
  connectWalletBtn.hidden = connected;
  disconnectWalletBtn.hidden = !connected;
  setConnectionStatus(
    connected ? T.walletConnected(shortTonAddress(connectedTonAddress)) : T.walletNotConnected,
    connected
  );
}

function loadTonConnectSdk() {
  if (getTonConnectUiClass()) return Promise.resolve();
  if (tonSdkLoadPromise) return tonSdkLoadPromise;

  tonSdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TON_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (getTonConnectUiClass()) {
        resolve();
      } else {
        tonSdkLoadPromise = null;
        reject(new Error('TON Connect UI class was not exported'));
      }
    };
    script.onerror = () => {
      tonSdkLoadPromise = null;
      reject(new Error('TON Connect SDK failed to load'));
    };
    document.head.appendChild(script);
  });

  return tonSdkLoadPromise;
}

async function getTonConnectUi() {
  if (tonConnectUi) return tonConnectUi;
  if (tonConnectInitPromise) return tonConnectInitPromise;

  tonConnectInitPromise = (async () => {
    await loadTonConnectSdk();
    const TonConnectUI = getTonConnectUiClass();
    if (!TonConnectUI) throw new Error('TON Connect UI is unavailable');

    const ui = new TonConnectUI({
      manifestUrl: TON_MANIFEST_URL,
      restoreConnection: true
    });

    ui.onStatusChange(
      wallet => renderConnectedWallet(wallet),
      error => console.error('TON Connect status error:', error)
    );
    tonConnectUi = ui;
    renderConnectedWallet(ui.wallet);
    return ui;
  })().catch(error => {
    tonConnectInitPromise = null;
    throw error;
  });

  return tonConnectInitPromise;
}

async function connectWallet() {
  connectWalletBtn.disabled = true;
  connectWalletBtnText.textContent = T.connectingWallet;
  setConnectionStatus(T.connectingWallet);

  try {
    const ui = await getTonConnectUi();
    await ui.openModal();
  } catch (error) {
    console.error('TON Connect initialization error:', error);
    setConnectionStatus(T.walletConnectFailed);
    showToast(T.walletConnectFailed);
  } finally {
    connectWalletBtn.disabled = false;
    if (!connectedTonAddress) connectWalletBtnText.textContent = T.connectWallet;
  }
}

async function disconnectWallet() {
  try {
    if (tonConnectUi) await tonConnectUi.disconnect();
  } catch (error) {
    console.error('TON Connect disconnect error:', error);
  } finally {
    State.tonAddress = '';
    saveState();
    renderConnectedWallet(null);
  }
}

function renderWalletProgress() {
  MIN_WITHDRAW = Number(State.config?.minWithdrawal || 0.01);
  const fill = document.getElementById('walletProgressFill');
  const progressText = document.getElementById('walletProgressText');
  if (!fill || !progressText) return;
  fill.style.width = Math.min(100, (State.balance / MIN_WITHDRAW) * 100) + '%';
  progressText.textContent = T.walletProgress(MIN_WITHDRAW);
}

function openWalletPage() {
  MIN_WITHDRAW = Number(State.config?.minWithdrawal || 0.01);
  document.getElementById('walletKicker').textContent = T.walletKicker;
  walletTitleText.textContent = T.walletTitle;
  document.getElementById('walletBalanceLabel').textContent = T.walletBalanceLabel;
  document.getElementById('walletBalanceHint').textContent = T.walletBalanceHint;
  document.getElementById('walletSpeedLabel').textContent = T.walletSpeedLabel;
  document.getElementById('walletSpeedValue').textContent = T.walletSpeedValue;
  document.getElementById('walletNetworkLabel').textContent = T.walletNetworkLabel;
  document.getElementById('walletDividerLabel').textContent = T.walletDivider;
  document.getElementById('walletAddressLabel').textContent = T.walletAddressLabel;
  walletMinNote.textContent = T.minWithdrawNote(MIN_WITHDRAW);
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
  getTonConnectUi().catch(error => {
    console.error('TON Connect preload error:', error);
    setConnectionStatus(T.walletSdkUnavailable);
  });
}

function closeWalletPage() {
  walletPage.classList.remove('show');
  walletPage.setAttribute('aria-hidden', 'true');
}

connectWalletBtn.addEventListener('click', connectWallet);
disconnectWalletBtn.addEventListener('click', disconnectWallet);
document.getElementById('walletBtn').addEventListener('click', openWalletPage);
document.getElementById('walletBackBtn').addEventListener('click', closeWalletPage);

copyAddressBtn.addEventListener('click', async () => {
  if (!connectedTonAddress) return showToast(T.connectWalletFirst);
  try {
    await navigator.clipboard.writeText(connectedTonAddress);
    showToast(T.copiedAddress);
  } catch (_) {
    tonAddressInput.select();
    showToast(T.copyAddress);
  }
});

withdrawBtn.addEventListener('click', async () => {
  if (!connectedTonAddress) return showToast(T.connectWalletFirst);
  if (State.balance < MIN_WITHDRAW) return showToast(T.notEnoughBalance(MIN_WITHDRAW));
  withdrawBtn.disabled = true;
  try {
    await requestWithdrawal();
    showToast(T.withdrawSent);
  } catch (error) {
    showToast(error.message || T.withdrawSent);
  } finally {
    withdrawBtn.disabled = false;
  }
});

watchAdBtn.addEventListener('click', () => startVerifiedAd());