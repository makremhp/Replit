/* ===================== إعلانات محكومة بالخادم ===================== */
let currentVerifiedAdSession = null;

function renderAdSlot(containerId, key) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  const frame = document.createElement('div');
  frame.className = 'ad-slot-placeholder';
  frame.dataset.adKey = key || '';
  frame.textContent = 'Advertisement';
  container.appendChild(frame);
}

async function startVerifiedAd() {
  try {
    currentVerifiedAdSession = await startAdSession();
    showToast('تم فتح جلسة الإعلان — انتظر تحقق مزود الإعلانات');
    return currentVerifiedAdSession;
  } catch (error) {
    showToast(error.message || 'لا يمكن بدء الإعلان الآن');
    return null;
  }
}

async function finishVerifiedAd() {
  if (!currentVerifiedAdSession?.sessionId) return false;
  try {
    await completeAdSession(currentVerifiedAdSession.sessionId);
    currentVerifiedAdSession = null;
    showToast('تمت إضافة المكافأة بعد التحقق');
    return true;
  } catch (error) {
    showToast(error.message || 'لم يتم التحقق من الإعلان');
    return false;
  }
}

    /* ===================== إعلانات 320×50 وSocial — إعدادات من الخادم ===================== */
    const FIXED_AD_SLOTS = ['adTop1', 'adTop2', 'adTop3', 'adBottom1', 'adBottom2', 'adBottom3'];
    let fixedAdSignature = '';
    function configuredFixedAdUnits() {
      const units = typeof State !== 'undefined' ? State.config?.fixedAdUnits : [];

      return Array.isArray(units) ? units : [];
    }
    function configuredSocialAdScripts() {
      const scripts = typeof State !== 'undefined' ? State.config?.socialAdScripts : [];

      return Array.isArray(scripts) ? scripts : [];
    }
    function renderMissingAdSlot(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.replaceChildren();
      const placeholder = document.createElement('div');
      placeholder.className = 'ad-slot-placeholder';
      placeholder.textContent = 'Ad code is not configured';
      container.appendChild(placeholder);
    }
    function renderFixedAdSlot(containerId, index, units) {
      const container = document.getElementById(containerId);
      const unit = units[index % units.length];
      if (!container || !unit) return;
      container.replaceChildren();
      const configScript = document.createElement('script');
      configScript.textContent = 'window.atOptions = ' + JSON.stringify({ key: unit.key, format: unit.format || 'iframe', height: 50, width: 320, params: unit.params || {} }) + ';';
      const providerScript = document.createElement('script');
      providerScript.src = unit.src;
      providerScript.async = false;
      providerScript.dataset.fixedAdSlot = containerId;
      container.append(configScript, providerScript);
    }
    function loadConfiguredAds() {
      const units = configuredFixedAdUnits();
      const socialScripts = configuredSocialAdScripts();
      const signature = JSON.stringify({ units: units, social: socialScripts });
      if (signature === fixedAdSignature) return;
      fixedAdSignature = signature;
      if (!units.length) {
        console.warn('320x50 ad codes are missing from server configuration');
        FIXED_AD_SLOTS.forEach(renderMissingAdSlot);
      } else {
        FIXED_AD_SLOTS.forEach((slot, index) => renderFixedAdSlot(slot, index, units));
      }
      document.querySelectorAll('script[data-managed-ad="social"]').forEach(script => script.remove());
      socialScripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.managedAd = 'social';
        document.body.appendChild(script);
      });
      if (!socialScripts.length) console.warn('Social ad codes are missing from server configuration');
    }
    window.addEventListener('six-houses-config-ready', loadConfiguredAds);
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadConfiguredAds, { timeout: 2500 });
    else window.setTimeout(loadConfiguredAds, 1800);
