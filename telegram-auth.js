const crypto = require('crypto');

function authError(message, statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function header(request, name) {
  if (request && typeof request.get === 'function') {
    return String(request.get(name) || '');
  }
  const headers = request?.headers || {};
  return String(headers[name.toLowerCase()] || headers[name] || '');
}

function normalizeBotToken(value) {
  const token = String(value || '').trim();
  if (token.length >= 2 &&
      ((token.startsWith('"') && token.endsWith('"')) ||
       (token.startsWith("'") && token.endsWith("'")))) {
    return token.slice(1, -1).trim();
  }
  return token;
}

function sortedDataCheckString(params, excludeSignature = false) {
  const entries = [...params.entries()]
    .filter(([key]) => key !== 'hash' && (!excludeSignature || key !== 'signature'))
    .sort(([left], [right]) => {
      if (left === right) return 0;
      return left < right ? -1 : 1;
    });
  return entries.map(([key, value]) => `${key}=${value}`).join('\n');
}

function matchesHash(receivedHash, calculatedHash) {
  const received = Buffer.from(receivedHash, 'hex');
  return received.length === calculatedHash.length &&
    crypto.timingSafeEqual(received, calculatedHash);
}

function verifyTelegramInitData(request, options = {}) {
  const initData = header(request, 'x-telegram-init-data');
  const botToken = normalizeBotToken(options.botToken ?? process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) throw authError('TELEGRAM_BOT_TOKEN is not configured', 503);
  if (!initData) throw authError('Telegram Web App authorization is required');

  const params = new URLSearchParams(initData);
  const seenKeys = new Set();
  for (const [key] of params.entries()) {
    if (seenKeys.has(key)) throw authError('Invalid Telegram authorization data');
    seenKeys.add(key);
  }

  const receivedHash = String(params.get('hash') || '').toLowerCase();
  const authDate = Number(params.get('auth_date'));
  const now = Number(options.now ?? Math.floor(Date.now() / 1000));
  const maxAge = Number(options.maxAge ?? process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS) || 3600;
  if (!/^[a-f0-9]{64}$/.test(receivedHash) ||
      !Number.isSafeInteger(authDate) ||
      !Number.isSafeInteger(now) ||
      now - authDate > maxAge ||
      authDate - now > 60) {
    throw authError('Invalid or expired Telegram authorization');
  }

  const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHashes = [
    sortedDataCheckString(params),
    sortedDataCheckString(params, true),
  ].map(dataCheckString =>
    crypto.createHmac('sha256', secretKey).update(dataCheckString).digest()
  );
  if (!calculatedHashes.some(hash => matchesHash(receivedHash, hash))) {
    throw authError('Invalid Telegram authorization signature');
  }

  let user;
  try {
    user = JSON.parse(params.get('user') || '{}');
  } catch (_) {
    user = null;
  }
  if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) {
    throw authError('Telegram user data is missing');
  }

  return {
    telegramUserId: Number(user.id),
    authDate,
    deviceId: header(request, 'x-device-id').slice(0, 160),
  };
}

module.exports = {
  normalizeBotToken,
  sortedDataCheckString,
  verifyTelegramInitData,
};