const express = require('express');
const path = require('path');
const {
  initDatabase,
  readState,
  writeState,
  collectCoin,
} = require('./database');
const { startTelegramBot, stopTelegramBot } = require('./bot');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));

function clientIdFrom(request) {
  const clientId = String(request.get('x-client-id') || '');
  if (!/^client-[A-Za-z0-9_-]{10,120}$/.test(clientId)) {
    const error = new Error('A valid X-Client-Id header is required');
    error.statusCode = 400;
    throw error;
  }
  return clientId;
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

app.get('/api/health', asyncRoute(async (_request, response) => {
  response.json({ ok: true, database: 'postgresql', telegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
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
  startTelegramBot().catch(error => console.error('Telegram bot failed to start:', error));
  const shutdown = () => {
    stopTelegramBot();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('Application failed to start:', error);
  process.exitCode = 1;
});
