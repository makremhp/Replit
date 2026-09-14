(function () {
  'use strict';

  const body = document.body;
  const gate = document.getElementById('securityGate');
  const message = document.getElementById('securityMessage');
  const retry = document.getElementById('securityRetry');
  if (!body || !gate || !message || !retry) return;

  const messages = {
    adblock: 'تم اكتشاف مانع إعلانات، يرجى إيقافه ثم إعادة المحاولة.',
    vpn: 'تم اكتشاف VPN أو Proxy، يرجى تعطيله ثم إعادة المحاولة.',
  };

  function setPending() {
    body.classList.add('security-check-pending');
    body.classList.remove('security-blocked');
    gate.hidden = true;
    retry.disabled = true;
  }

  function allowApp() {
    body.classList.remove('security-check-pending', 'security-blocked');
    gate.hidden = true;
    retry.disabled = false;
  }

  function blockApp(reason) {
    body.classList.remove('security-check-pending');
    body.classList.add('security-blocked');
    message.textContent = messages[reason] || messages.adblock;
    gate.hidden = false;
    retry.disabled = false;
  }

  function detectAdBlock() {
    return new Promise(resolve => {
      const bait = document.createElement('div');
      bait.className = 'security-ad-bait ad adsbox ad-banner ad-unit pub_300x250';
      bait.setAttribute('aria-hidden', 'true');
      bait.textContent = 'ad';
      bait.style.cssText = 'position:absolute!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;display:block!important;visibility:visible!important;pointer-events:none!important;';
      document.body.appendChild(bait);
      window.setTimeout(() => {
        const styles = window.getComputedStyle(bait);
        const blocked = styles.display === 'none' || styles.visibility === 'hidden' || bait.offsetHeight === 0 || bait.clientHeight === 0;
        bait.remove();
        resolve(blocked);
      }, 160);
    });
  }

  async function detectVpnOrProxy() {
    try {
      const response = await fetch('/api/security/check?ts=' + Date.now(), { cache: 'no-store', headers: { accept: 'application/json' } });
      if (!response.ok) return null;
      const result = await response.json();
      return result && result.blocked === true ? 'vpn' : null;
    } catch (_) {
      return null;
    }
  }

  async function runChecks() {
    setPending();
    const results = await Promise.all([detectAdBlock(), detectVpnOrProxy()]);
    if (results[0]) return blockApp('adblock');
    if (results[1]) return blockApp('vpn');
    allowApp();
  }

  retry.addEventListener('click', runChecks);
  runChecks();
}());
