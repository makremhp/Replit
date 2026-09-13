const express = require('express');
const path = require('path');
const crypto = require('crypto');
const {
  initDatabase,
  readState,
  writeState,
  collectCoin,
} = require('./database');

const app = express();
const port = Number(process.env.PORT) || 3000;

let databaseInitialization;
function ensureDatabase() {
  if (!databaseInitialization) databaseInitialization = initDatabase();
  return databaseInitialization;
}

app.use(express.json({ limit: '32kb' }));

function telegramIdentityFrom(request) {
  const initData = String(request.get('x-telegram-init-data') || '');
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '');
  if (!botToken) {
    const error = new Error('TELEGRAM_BOT_TOKEN is not configured');
    error.statusCode = 503;
    throw error;
  }
  if (!initData) {
    const error = new Error('Telegram Web App authorization is required');
    error.statusCode = 401;
    throw error;
  }
  const params = new URLSearchParams(initData);
  const receivedHash = String(params.get('hash') || '').toLowerCase();
  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (!/^[a-f0-9]{64}$/.test(receivedHash) || !Number.isInteger(authDate) || now - authDate > 86400 || authDate - now > 300) {
    const error = new Error('Invalid or expired Telegram authorization');
    error.statusCode = 401;
    throw error;
  }
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(calculatedHash, 'hex'))) {
    const error = new Error('Invalid Telegram authorization signature');
    error.statusCode = 401;
    throw error;
  }
  let user;
  try { user = JSON.parse(params.get('user') || '{}'); } catch { user = null; }
  if (!user || !user.id) {
    const error = new Error('Telegram user data is missing');
    error.statusCode = 401;
    throw error;
  }
  return { user, clientId: 'client-telegram-' + String(user.id) };
}

function clientIdFrom(request) {
  if (!request.telegramIdentity) {
    const error = new Error('Telegram authorization is required');
    error.statusCode = 401;
    throw error;
  }
  return request.telegramIdentity.clientId;
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

app.get('/api/health', asyncRoute(async (_request, response) => {
  await ensureDatabase();
  response.json({ ok: true, database: 'postgresql', telegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
}));

app.use('/api', asyncRoute(async (request, _response, next) => {
  await ensureDatabase();
  request.telegramIdentity = telegramIdentityFrom(request);
  next();
}));

app.get('/api/state', asyncRoute(async (request, response) => {
  response.json(await readState(clientIdFrom(request)));
}));

app.post('/api/state', asyncRoute(async (request, response) => {
  response.json(await writeState(clientIdFrom(request), request.body || {}));
}));

app.post('/api/collect', asyncRoute(async (request, response) => {
  response.json(await collectCoin(clientIdFrom(request), Number(request.body?.houseId) || 1));
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
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
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
