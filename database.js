const { Pool } = require('pg');

const HOUSES = {
  1: { coinValue: 0.00005, coinIntervalMs: 15000 },
  2: { coinValue: 0.00006, coinIntervalMs: 13000, unlock: ['referrals', 15] },
  3: { coinValue: 0.00007, coinIntervalMs: 11000, unlock: ['ads', 50] },
  4: { coinValue: 0.00008, coinIntervalMs: 10000, unlock: ['ads', 10] },
  5: { coinValue: 0.0001, coinIntervalMs: 9000, unlock: ['deposit', 0.03] },
  6: { coinValue: 0.00009, coinIntervalMs: 8000, unlock: ['referrals', 1] },
};

const databaseUrl = process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL or EXTERNAL_DATABASE_URL is not set. Set one before starting the app.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.DATABASE_POOL_SIZE) || 10,
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    client_id TEXT PRIMARY KEY,
    balance NUMERIC(18, 8) NOT NULL DEFAULT 0,
    referrals INTEGER NOT NULL DEFAULT 0,
    ads INTEGER NOT NULL DEFAULT 0,
    deposit NUMERIC(18, 8) NOT NULL DEFAULT 0,
    unlocked_houses JSONB NOT NULL DEFAULT '[1]'::jsonb,
    active_house_id INTEGER NOT NULL DEFAULT 1,
    ton_address TEXT,
    last_seen_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );


  CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES users(client_id) ON DELETE CASCADE,
    amount NUMERIC(18, 8) NOT NULL CHECK (amount > 0),
    ton_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id BIGINT
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT REFERENCES users(client_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);
  CREATE INDEX IF NOT EXISTS activity_log_client_idx ON activity_log(client_id, created_at DESC);
`;

let initialized = false;

async function initDatabase() {
  if (initialized) return;
  if (!databaseUrl) throw new Error('DATABASE_URL or EXTERNAL_DATABASE_URL is required');
  await pool.query(schema);
  initialized = true;
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

function number(value) {
  return Number(value || 0);
}

function stateFor(user, serverTime, earned = 0) {
  const progress = normalizeProgress(user);
  return {
    clientId: user.client_id,
    balance: Number(number(user.balance).toFixed(6)),
    progress,
    unlockedHouses: unlockedFor(progress),
    activeHouseId: Number(user.active_house_id),
    tonAddress: user.ton_address || '',
    earnedSinceLastSync: Number(Number(earned).toFixed(6)),
    serverTime,
  };
}

async function getOrCreateUser(clientId, now = Date.now(), client = pool) {
  await client.query(
    `INSERT INTO users (client_id, last_seen_at, created_at, updated_at)
     VALUES ($1, $2, $2, $2)
     ON CONFLICT (client_id) DO NOTHING`,
    [clientId, now]
  );
  const result = await client.query('SELECT * FROM users WHERE client_id = $1', [clientId]);
  return result.rows[0];
}

async function logActivity(clientId, action, metadata = {}, client = pool) {
  await client.query(
    'INSERT INTO activity_log (client_id, action, metadata) VALUES ($1, $2, $3::jsonb)',
    [clientId, action, JSON.stringify(metadata)]
  );
}

async function readState(clientId) {
  const now = Date.now();
  const user = await getOrCreateUser(clientId, now);
  return stateFor(user, now);
}

async function writeState(clientId, body = {}) {
  const now = Date.now();
  const progress = normalizeProgress(body.progress);
  const unlocked = unlockedFor(progress);
  const requestedHouse = Number(body.activeHouseId) || 1;
  const activeHouseId = unlocked.includes(requestedHouse) ? requestedHouse : 1;
  const tonAddress = typeof body.tonAddress === 'string' ? body.tonAddress.trim().slice(0, 200) : '';
  await getOrCreateUser(clientId, now);
  await pool.query(
    `UPDATE users
     SET referrals = $1, ads = $2, deposit = $3, unlocked_houses = $4::jsonb,
         active_house_id = $5, ton_address = $6, updated_at = $7
     WHERE client_id = $8`,
    [progress.referrals, progress.ads, progress.deposit, JSON.stringify(unlocked), activeHouseId, tonAddress || null, now, clientId]
  );
  await logActivity(clientId, 'state_updated');
  return readState(clientId);
}

async function collectCoin(clientId, houseId = 1) {
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(clientId, now, client);
    const progress = normalizeProgress(user);
    const numericHouseId = Number(houseId) || 1;
    if (!unlockedFor(progress).includes(numericHouseId)) throw new Error('This house is not unlocked');
    const house = HOUSES[numericHouseId];
    await client.query(
      'UPDATE users SET balance = balance + $1, active_house_id = $2, updated_at = $3 WHERE client_id = $4',
      [house.coinValue, numericHouseId, now, clientId]
    );
    await logActivity(clientId, 'coin_collected', { houseId: numericHouseId, amount: house.coinValue }, client);
    await client.query('COMMIT');
    const updated = await client.query('SELECT * FROM users WHERE client_id = $1', [clientId]);
    return stateFor(updated.rows[0], now, house.coinValue);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function setActiveHouse(clientId, houseId) {
  const current = await getOrCreateUser(clientId);
  const progress = normalizeProgress(current);
  const numericHouseId = Number(houseId);
  if (!HOUSES[numericHouseId] || !unlockedFor(progress).includes(numericHouseId)) {
    throw new Error('This house is not unlocked');
  }
  await pool.query('UPDATE users SET active_house_id = $1, updated_at = $2 WHERE client_id = $3', [numericHouseId, Date.now(), clientId]);
  await logActivity(clientId, 'house_selected', { houseId: numericHouseId });
  return readState(clientId);
}

async function setTonAddress(clientId, address) {
  const value = String(address || '').trim();
  if (value.length < 20 || value.length > 200) throw new Error('Enter a valid TON address');
  await getOrCreateUser(clientId);
  await pool.query('UPDATE users SET ton_address = $1, updated_at = $2 WHERE client_id = $3', [value, Date.now(), clientId]);
  await logActivity(clientId, 'wallet_updated');
  return readState(clientId);
}


async function createWithdrawal(clientId) {
  const minimum = Number(process.env.MIN_WITHDRAWAL || 0.01);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM users WHERE client_id = $1 FOR UPDATE', [clientId]);
    const user = result.rows[0];
    if (!user || !user.ton_address) throw new Error('Set your TON wallet first');
    const amount = number(user.balance);
    if (amount < minimum) throw new Error(`Minimum withdrawal is ${minimum} USDT`);
    const withdrawal = await client.query(
      `INSERT INTO withdrawals (client_id, amount, ton_address)
       VALUES ($1, $2, $3) RETURNING id, amount, ton_address, status, created_at`,
      [clientId, amount, user.ton_address]
    );
    await client.query('UPDATE users SET balance = 0, updated_at = $1 WHERE client_id = $2', [Date.now(), clientId]);
    await logActivity(clientId, 'withdrawal_requested', { withdrawalId: withdrawal.rows[0].id, amount }, client);
    await client.query('COMMIT');
    return withdrawal.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listUserWithdrawals(clientId, limit = 10) {
  const result = await pool.query(
    'SELECT id, amount, ton_address, status, created_at, reviewed_at FROM withdrawals WHERE client_id = $1 ORDER BY id DESC LIMIT $2',
    [clientId, limit]
  );
  return result.rows;
}

module.exports = {
  HOUSES,
  pool,
  initDatabase,
  readState,
  writeState,
  collectCoin,
  setActiveHouse,
  setTonAddress,
  createWithdrawal,
  listUserWithdrawals,
};
