const express = require('express');
const path = require('path');
const crypto = require('crypto');
const {
  pool,
  initDatabase,
  readState,
  writeState,
  collectCoin,
  startAd,
  verifyAdSession,
  completeAd,
  createWithdrawal,
  listUserWithdrawals,
} = require('./database');

const app = express();
const port = Number(process.env.PORT) || 3000;
let databaseInitialization;
const requestBuckets = new Map();

function ensureDatabase() {
  if (!databaseInitialization) databaseInitialization = initDatabase();
  return databaseInitialization;
}

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function verifyTelegramInitData(request) {
  const initData = String(request.get('x-telegram-init-data') || '');
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '');
  if (!botToken) throw fail('TELEGRAM_BOT_TOKEN is not configured', 503);
  if (!initData) throw fail('Telegram Web App authorization is required', 401);
  const params = new URLSearchParams(initData);
  const receivedHash = String(params.get('hash') || '').toLowerCase();
  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  const maxAge = Number(process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS) || 3600;
  if (!/^[a-f0-9]{64}$/.test(receivedHash) ||
      !Number.isInteger(authDate) ||
      now - authDate > maxAge ||
      authDate - now > 60) {
    throw fail('Invalid or expired Telegram authorization', 401);
  }
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(calculatedHash, 'hex'))) {
    throw fail('Invalid Telegram authorization signature', 401);
  }
  let user;
  try {
    user = JSON.parse(params.get('user') || '{}');
  } catch (_) {
    user = null;
  }
  if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) {
    throw fail('Telegram user data is missing', 401);
  }
  return {
    telegramUserId: Number(user.id),
    authDate,
    deviceId: String(request.get('x-device-id') || '').slice(0, 160),
  };
}

function rateLimit(request, key, max = 120, windowMs = 60000) {
  const now = Date.now();
  const bucketKey = `${key}:${request.ip}`;
  const current = requestBuckets.get(bucketKey);
  if (!current || now - current.startedAt >= windowMs) {
    requestBuckets.set(bucketKey, { startedAt: now, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > max) throw fail('Too many requests', 429);
}

function idempotencyKey(request) {
  return String(request.get('idempotency-key') || '');
}

app.post(
  '/api/ads/webhook',
  express.raw({ type: 'application/json', limit: '16kb' }),
  asyncRoute(async (request, response) => {
    const secret = String(process.env.AD_PROVIDER_WEBHOOK_SECRET || '');
    if (!secret) throw fail('Ad provider webhook is not configured', 503);
    const signature = String(request.get('x-ad-provider-signature') || '');
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from('');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature) ||
        !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      throw fail('Invalid ad provider signature', 401);
    }
    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (_) {
      throw fail('Invalid webhook payload', 400);
    }
    if (!payload.sessionId || !payload.providerEventId) throw fail('Webhook fields are missing', 400);
    await ensureDatabase();
    const verified = await verifyAdSession(String(payload.sessionId), String(payload.providerEventId));
    response.status(verified ? 200 : 409).json({ verified });
  })
);

app.use(express.json({ limit: '32kb' }));
app.use('/api', asyncRoute(async (request, _response, next) => {
  await ensureDatabase();
  rateLimit(request, 'ip');
  if (request.path === '/health') return next();
  request.telegramIdentity = verifyTelegramInitData(request);
  rateLimit(request, `user:${request.telegramIdentity.telegramUserId}`, 180);
  next();
}));

app.get('/api/health', asyncRoute(async (_request, response) => {
  await ensureDatabase();
  response.json({ ok: true, database: 'postgresql', telegramMiniApp: true });
}));

app.get('/api/state', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.json(await readState(identity.telegramUserId, identity));
}));

app.post('/api/state', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.json(await writeState(identity.telegramUserId, request.body || {}, identity));
}));

app.post('/api/collect', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.json(await collectCoin(
    identity.telegramUserId,
    request.body?.coinId,
    idempotencyKey(request),
    identity
  ));
}));

app.post('/api/ads/start', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.json(await startAd(identity.telegramUserId, identity));
}));

app.post('/api/ads/complete', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.json(await completeAd(
    identity.telegramUserId,
    request.body?.sessionId,
    idempotencyKey(request),
    identity
  ));
}));

app.post('/api/withdrawals', asyncRoute(async (request, response) => {
  const identity = request.telegramIdentity;
  response.status(201).json(await createWithdrawal(identity.telegramUserId, idempotencyKey(request), identity));
}));

app.get('/api/withdrawals', asyncRoute(async (request, response) => {
  response.json(await listUserWithdrawals(request.telegramIdentity.telegramUserId));
}));

app.use(express.static(__dirname));
app.get('*', (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Internal server error',
  });
});

async function start() {
  await initDatabase();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Six Houses server listening on port ${port}`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch(error => {
    console.error('Application failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = app;