
const BOT_USERNAME = 'zombie_housBot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}/play`;

function openReferralShare() {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(T.shareText)}`;
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank', 'noopener');
  }
}

document.getElementById('shareBtn').addEventListener('click', openReferralShare);

/* ===================== اتصال TON Connect — تنفيذ جديد ===================== */
let MIN_WITHDRAW = 0.01;
const TON_SDK_URL = 'https://unpkg.com/@tonconnect/ui@2.2.0/dist/tonconnect-ui.min.js';
const TON_MANIFEST_URL = new URL('tonconnect-manifest.json', document.baseURI).href;

const walletPage = document.getElementById('walletPage');
const walletTitleText = document.getElementById('walletTitleText');
const walletMinNote = document.getElementById('walletMinNote');
const tonAddressInput = document.getElementById('tonAddressInput');
const withdrawBtn = document.getElementById('withdrawBtn');
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



    function crc16Ccitt(bytes) {
    let crc = 0;
    for (const byte of bytes) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
      }
    }
    return crc;
    }

    function toFriendlyTonAddress(address) {
    const value = String(address || '').trim();
    if (!value) return '';
    // A wallet may already return a valid user-friendly address such as UQ... or EQ....
    if (!value.includes(':') && /^[A-Za-z0-9_-]{48}$/.test(value)) return value;
    const [workchainText, hashHex] = value.split(':');
    if (!/^-?\d+$/.test(workchainText || '') || !/^[a-f0-9]{64}$/i.test(hashHex || '')) return value;
    const workchain = Number(workchainText);
    if (workchain !== 0 && workchain !== -1) return value;

    const payload = new Uint8Array(34);
    // 0x51 = non-bounceable mainnet address, the UQ... format requested by the app.
    payload[0] = 0x51;
    payload[1] = workchain === -1 ? 0xff : 0x00;
    for (let index = 0; index < 32; index += 1) {
      payload[index + 2] = parseInt(hashHex.slice(index * 2, index * 2 + 2), 16);
    }

    const checksum = crc16Ccitt(payload);
    const bytes = new Uint8Array(36);
    bytes.set(payload);
    bytes[34] = (checksum >> 8) & 0xff;
    bytes[35] = checksum & 0xff;
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    
function renderConnectedWallet(wallet) {
  const rawTonAddress = String(wallet?.account?.address || '').trim();
  connectedTonAddress = toFriendlyTonAddress(rawTonAddress);
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
    connected ? T.walletConnected(connectedTonAddress) : T.walletNotConnected,
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
  const guestVisitor = window.isTelegramMiniApp === false;
  withdrawBtn.disabled = guestVisitor;
  withdrawBtn.setAttribute('aria-disabled', String(guestVisitor));
  withdrawBtn.title = guestVisitor ? T.guestWithdraw : '';
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