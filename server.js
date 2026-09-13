const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDirectory = process.env.DB_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(path.join(dataDirectory, 'six-houses.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    client_id TEXT PRIMARY KEY,
    balance REAL NOT NULL DEFAULT 0,
    referrals INTEGER NOT NULL DEFAULT 0,
    ads INTEGER NOT NULL DEFAULT 0,
    deposit REAL NOT NULL DEFAULT 0,
    unlocked_houses TEXT NOT NULL DEFAULT '[1]',
    active_house_id INTEGER NOT NULL DEFAULT 1,
    ton_address TEXT,
    last_seen_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

const HOUSES = {
  1: { coinValue: 0.00005, coinIntervalMs: 15000 },
  2: { coinValue: 0.00006, coinIntervalMs: 13000, unlock: ['referrals', 15] },
  3: { coinValue: 0.00007, coinIntervalMs: 11000, unlock: ['ads', 50] },
  4: { coinValue: 0.00008, coinIntervalMs: 10000, unlock: ['ads', 10] },
  5: { coinValue: 0.00010, coinIntervalMs: 9000, unlock: ['deposit', 0.03] },
  6: { coinValue: 0.00009, coinIntervalMs: 8000, unlock: ['referrals', 1] },
};

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

function normalizeProgress(progress = {}) {
  return {
    referrals: Math.max(0, Math.floor(Number(progress.referrals) || 0)),
    ads: Math.max(0, Math.floor(Number(progress.ads) || 0)),
    deposit: Math.max(0, Number(progress.deposit) || 0),
  };
}

function unlockedFor(progress) {
  return Object.entries(HOUSES)
    .filter(([, house]) => {
      if (!house.unlock) return true;
      const [type, need] = house.unlock;
      return progress[type] >= need;
    })
    .map(([id]) => Number(id));
}

function getOrCreateUser(clientId, now) {
  let user = db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId);
  if (!user) {
    db.prepare(`
      INSERT INTO users (client_id, last_seen_at, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(clientId, now, now, now);
    user = db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId);
  }
  return user;
}

function accrue(user, now) {
  const progress = normalizeProgress(user);
  const unlocked = unlockedFor(progress);
  const activeHouseId = unlocked.includes(Number(user.active_house_id))
    ? Number(user.active_house_id)
    : 1;
  const house = HOUSES[activeHouseId] || HOUSES[1];
  const maxElapsed = 30 * 24 * 60 * 60 * 1000;
  const elapsed = Math.min(Math.max(0, now - Number(user.last_seen_at)), maxElapsed);
  const cycles = Math.floor(elapsed / house.coinIntervalMs);
  const earned = cycles * house.coinValue;
  const nextLastSeen = cycles > 0
    ? Number(user.last_seen_at) + cycles * house.coinIntervalMs
    : Number(user.last_seen_at);

  if (earned > 0 || activeHouseId !== Number(user.active_house_id)) {
    db.prepare(`
      UPDATE users
      SET balance = balance + ?, active_house_id = ?, last_seen_at = ?, updated_at = ?
      WHERE client_id = ?
    `).run(earned, activeHouseId, nextLastSeen, now, user.client_id);
  }
  return earned;
}

function stateFor(user, serverTime, earned = 0) {
  const progress = normalizeProgress(user);
  return {
    clientId: user.client_id,
    balance: Number(user.balance.toFixed(6)),
    progress,
    unlockedHouses: unlockedFor(progress),
    activeHouseId: Number(user.active_house_id),
    tonAddress: user.ton_address || '',
    earnedSinceLastSync: Number(earned.toFixed(6)),
    serverTime,
  };
}

function readState(clientId) {
  const now = Date.now();
  getOrCreateUser(clientId, now);
  const user = db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId);
  return stateFor(user, now, 0);
}

function writeState(clientId, body) {
  const now = Date.now();
  const transaction = db.transaction(() => {
    getOrCreateUser(clientId, now);
    const progress = normalizeProgress(body.progress);
    const unlocked = unlockedFor(progress);
    const requestedHouse = Number(body.activeHouseId) || 1;
    const activeHouseId = unlocked.includes(requestedHouse) ? requestedHouse : 1;
    const tonAddress = typeof body.tonAddress === 'string'
      ? body.tonAddress.trim().slice(0, 200)
      : '';
    db.prepare(`
      UPDATE users
      SET referrals = ?, ads = ?, deposit = ?, unlocked_houses = ?,
          active_house_id = ?, ton_address = ?, updated_at = ?
      WHERE client_id = ?
    `).run(
      progress.referrals,
      progress.ads,
      progress.deposit,
      JSON.stringify(unlocked),
      activeHouseId,
      tonAddress || null,
      now,
      clientId
    );
  });
  transaction();
  const user = db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId);
  return stateFor(user, now, 0);
}

function collectCoin(clientId, body) {
  const now = Date.now();
  let collectedValue = 0;
  const transaction = db.transaction(() => {
    const user = getOrCreateUser(clientId, now);
    const progress = normalizeProgress(user);
    const unlocked = unlockedFor(progress);
    const houseId = Number(body.houseId) || 1;
    if (!unlocked.includes(houseId)) {
      const error = new Error('This house is not unlocked');
      error.statusCode = 400;
      throw error;
    }
    const house = HOUSES[houseId];
    collectedValue = house.coinValue;
    db.prepare(`
      UPDATE users
      SET balance = balance + ?, active_house_id = ?, updated_at = ?
      WHERE client_id = ?
    `).run(collectedValue, houseId, now, clientId);
  });
  transaction();
  const user = db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId);
  return stateFor(user, now, collectedValue);
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, database: 'sqlite' });
});

app.get('/api/state', (request, response, next) => {
  try {
    response.json(readState(clientIdFrom(request)));
  } catch (error) {
    next(error);
  }
});

app.post('/api/state', (request, response, next) => {
  try {
    response.json(writeState(clientIdFrom(request), request.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post('/api/collect', (request, response, next) => {
  try {
    response.json(collectCoin(clientIdFrom(request), request.body || {}));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(__dirname));
app.get('*', (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Internal server error',
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Six Houses server listening on port ${port}`);
});