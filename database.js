const { Pool } = require('pg');
const crypto = require('crypto');

const HOUSES = {
  1: { unlock: null, coinMultiplier: 0.20, production: 0 },
  2: { unlock: ['referrals', 3], coinMultiplier: 0.35, production: 0 },
  3: { unlock: ['referrals', 15], coinMultiplier: 0.50, production: 0 },
  4: { unlock: ['referrals', 45], coinMultiplier: 0, production: 0.0001 },
  5: { unlock: ['ads', 50], coinMultiplier: 0, production: 0.0002 },
  6: { unlock: ['referrals', 3], coinMultiplier: 0.8, production: 0 },
};

const DEFAULT_SETTINGS = {
  max_active_coins: 10,
  coin_spawn_interval_ms: 15000,
  coin_value: 0.00005,
  coin_lifetime_ms: 120000,
  min_withdrawal: 0.01,
  withdrawal_fee: 0,
  ad_reward: 0.0001,
  ad_cooldown_ms: 60000,
  ad_daily_limit: 50,
  ad_session_ttl_ms: 120000,
  house_production_interval_ms: 120000,
};

const databaseUrl = process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;
if (!databaseUrl) console.warn('DATABASE_URL or EXTERNAL_DATABASE_URL is not set.');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.DATABASE_POOL_SIZE) || 10,
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    telegram_user_id BIGINT PRIMARY KEY,
    client_id TEXT UNIQUE NOT NULL,
    balance NUMERIC(18, 8) NOT NULL DEFAULT 0,
    reserved_balance NUMERIC(18, 8) NOT NULL DEFAULT 0,
    referrals INTEGER NOT NULL DEFAULT 0,
    ads INTEGER NOT NULL DEFAULT 0,
    deposit NUMERIC(18, 8) NOT NULL DEFAULT 0,
    ton_address TEXT,
    device_id TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0,
    last_ad_completed_at BIGINT,
    last_coin_spawn_at BIGINT,
    created_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS collectible_coins (
    id TEXT PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    value NUMERIC(18, 8) NOT NULL CHECK (value > 0),
    spawned_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    collected_at BIGINT
  );

  CREATE TABLE IF NOT EXISTS house_unlocks (
    telegram_user_id BIGINT NOT NULL,
    house_id INTEGER NOT NULL,
    unlocked_at BIGINT NOT NULL,
    PRIMARY KEY (telegram_user_id, house_id)
  );

  CREATE TABLE IF NOT EXISTS house_production (
    telegram_user_id BIGINT NOT NULL,
    house_id INTEGER NOT NULL,
    last_settled_at BIGINT NOT NULL,
    PRIMARY KEY (telegram_user_id, house_id)
  );

  CREATE TABLE IF NOT EXISTS ad_sessions (
    id TEXT PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    reward NUMERIC(18, 8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'verified', 'completed', 'failed', 'expired')),
    started_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    provider_event_id TEXT UNIQUE,
    provider_verified_at BIGINT,
    completed_at BIGINT
  );

  CREATE TABLE IF NOT EXISTS ad_completions (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    ad_session_id TEXT NOT NULL UNIQUE REFERENCES ad_sessions(id),
    reward NUMERIC(18, 8) NOT NULL,
    completed_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    amount NUMERIC(18, 8) NOT NULL CHECK (amount > 0),
    fee NUMERIC(18, 8) NOT NULL DEFAULT 0,
    ton_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id BIGINT
  );

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    telegram_user_id BIGINT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (telegram_user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS device_links (
    device_id TEXT NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    first_seen_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    PRIMARY KEY (device_id, telegram_user_id)
  );

  CREATE TABLE IF NOT EXISTS risk_events (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT,
    device_id TEXT,
    event_type TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT,
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    bucket_key TEXT PRIMARY KEY,
    window_started_at BIGINT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS referrals (
    referred_telegram_user_id BIGINT PRIMARY KEY,
    referrer_telegram_user_id BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title JSONB NOT NULL,
    reward NUMERIC(18, 8) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS user_tasks (
    telegram_user_id BIGINT NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at BIGINT,
    PRIMARY KEY (telegram_user_id, task_id)
  );

  CREATE INDEX IF NOT EXISTS collectible_coins_user_active_idx
    ON collectible_coins(telegram_user_id, collected_at, expires_at);
  CREATE INDEX IF NOT EXISTS ad_sessions_user_idx
    ON ad_sessions(telegram_user_id, started_at DESC);
  CREATE INDEX IF NOT EXISTS audit_logs_user_idx
    ON audit_logs(telegram_user_id, created_at DESC);
`;

let initialized = false;

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function number(value) {
  return Number(value || 0);
}

function integer(value) {
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : 0;
}

function hashRequest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value || {})).digest('hex');
}

async function migrateLegacyUsers(client) {
  const migrationQuery = async (label, query) => {
    try {
      return await client.query(query);
    } catch (error) {
      error.message = `${label}: ${error.message}`;
      throw error;
    }
  };
  const columns = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'`
  );
  if (!columns.rows.length) return;
  const names = new Set(columns.rows.map(row => row.column_name));
  const additions = {
    telegram_user_id: 'BIGINT',
    reserved_balance: 'NUMERIC(18, 8) NOT NULL DEFAULT 0',
    device_id: 'TEXT',
    risk_score: 'INTEGER NOT NULL DEFAULT 0',
    last_ad_completed_at: 'BIGINT',
    last_coin_spawn_at: 'BIGINT',
  };
  for (const [name, type] of Object.entries(additions)) {
    await migrationQuery(
      `users.add_column.${name}`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${type}`
    );
  }
  if (names.has('client_id')) {
    await migrationQuery(
      'users.backfill_telegram_user_id',
      `UPDATE users
       SET telegram_user_id = NULLIF(regexp_replace(client_id, '[^0-9]', '', 'g'), '')::BIGINT
       WHERE telegram_user_id IS NULL AND client_id ~ '[0-9]'`
    );
  }
  await migrationQuery(
    'users.telegram_user_id_index',
    `CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_user_id_uidx
     ON users(telegram_user_id)`
  );
  const withdrawalColumns = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'withdrawals'`
  );
  if (withdrawalColumns.rows.length) {
    const withdrawalNames = new Set(withdrawalColumns.rows.map(row => row.column_name));
    await migrationQuery(
      'withdrawals.add_column.telegram_user_id',
      'ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT'
    );
    await migrationQuery(
      'withdrawals.add_column.fee',
      'ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee NUMERIC(18, 8) NOT NULL DEFAULT 0'
    );
    if (withdrawalNames.has('client_id')) {
      await migrationQuery(
        'withdrawals.backfill_telegram_user_id',
        `UPDATE withdrawals w SET telegram_user_id = u.telegram_user_id
         FROM users u WHERE w.telegram_user_id IS NULL AND w.client_id = u.client_id`
      );
    }
    await migrationQuery(
      'withdrawals.telegram_user_id_index',
      `CREATE INDEX IF NOT EXISTS withdrawals_telegram_user_id_idx
       ON withdrawals(telegram_user_id)`
    );
  }
}

async function seedSettings(client) {
  const settings = {
    ...DEFAULT_SETTINGS,
    houses: HOUSES,
  };
  for (const [key, value] of Object.entries(settings)) {
    const query = key === 'houses'
      ? `INSERT INTO system_settings(key, value) VALUES($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
      : `INSERT INTO system_settings(key, value) VALUES($1, $2::jsonb)
         ON CONFLICT (key) DO NOTHING`;
    await client.query(query, [key, JSON.stringify(value)]);
  }
}

async function initDatabase() {
  if (initialized) return;
  if (!databaseUrl) throw appError('DATABASE_URL or EXTERNAL_DATABASE_URL is required', 503);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);
    await migrateLegacyUsers(client);
    await seedSettings(client);
    await client.query('COMMIT');
    initialized = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getSettings(client = pool) {
  const result = await client.query('SELECT key, value FROM system_settings');
  const settings = { ...DEFAULT_SETTINGS, houses: HOUSES };
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

function safeConfig(settings) {
  return {
    maxActiveCoins: integer(settings.max_active_coins) || DEFAULT_SETTINGS.max_active_coins,
    coinSpawnIntervalMs: integer(settings.coin_spawn_interval_ms) || DEFAULT_SETTINGS.coin_spawn_interval_ms,
    coinLifetimeMs: integer(settings.coin_lifetime_ms) || DEFAULT_SETTINGS.coin_lifetime_ms,
    minWithdrawal: number(settings.min_withdrawal),
    withdrawalFee: number(settings.withdrawal_fee),
    adCooldownMs: integer(settings.ad_cooldown_ms),
    adDailyLimit: integer(settings.ad_daily_limit),
    adSessionTtlMs: integer(settings.ad_session_ttl_ms),
    houses: settings.houses || HOUSES,
  };
}

function normalizedUserId(value) {
  const userId = Number(value);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw appError('A valid Telegram user ID is required', 401);
  }
  return userId;
}

async function logAudit(telegramUserId, action, metadata = {}, client = pool) {
  await client.query(
    `INSERT INTO audit_logs(telegram_user_id, action, metadata)
     VALUES($1, $2, $3::jsonb)`,
    [telegramUserId, action, JSON.stringify(metadata)]
  );
}

async function logRisk(telegramUserId, deviceId, eventType, score, metadata = {}, client = pool) {
  await client.query(
    `INSERT INTO risk_events(telegram_user_id, device_id, event_type, score, metadata)
     VALUES($1, $2, $3, $4, $5::jsonb)`,
    [telegramUserId, deviceId || null, eventType, score, JSON.stringify(metadata)]
  );
  await client.query(
    `UPDATE users SET risk_score = LEAST(100, risk_score + $1), updated_at = $2
     WHERE telegram_user_id = $3`,
    [score, Date.now(), telegramUserId]
  );
}

async function getOrCreateUser(telegramUserId, context = {}, client = pool) {
  const userId = normalizedUserId(telegramUserId);
  const now = Date.now();
  const clientId = String(userId);
  await client.query(
    `INSERT INTO users(telegram_user_id, client_id, created_at, last_seen_at, updated_at, device_id)
     VALUES($1, $2, $3, $3, $3, $4)
     ON CONFLICT(telegram_user_id) DO UPDATE
       SET last_seen_at = EXCLUDED.last_seen_at, updated_at = EXCLUDED.updated_at`,
    [userId, clientId, now, context.deviceId || null]
  );
  const userResult = await client.query(
    'SELECT * FROM users WHERE telegram_user_id = $1 FOR UPDATE',
    [userId]
  );
  const user = userResult.rows[0];
  if (context.deviceId) {
    const device = String(context.deviceId).slice(0, 160);
    await client.query(
      `INSERT INTO device_links(device_id, telegram_user_id, first_seen_at, last_seen_at)
       VALUES($1, $2, $3, $3)
       ON CONFLICT(device_id, telegram_user_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
      [device, userId, now]
    );
    const other = await client.query(
      `SELECT telegram_user_id FROM device_links
       WHERE device_id = $1 AND telegram_user_id <> $2 LIMIT 5`,
      [device, userId]
    );
    if (other.rows.length) {
      await logRisk(userId, device, 'device_reused_by_multiple_accounts', 10, {
        otherUserIds: other.rows.map(row => String(row.telegram_user_id)),
      }, client);
    } else if (!user.device_id) {
      await client.query(
        'UPDATE users SET device_id = $1, updated_at = $2 WHERE telegram_user_id = $3',
        [device, now, userId]
      );
    }
  }
  const fresh = await client.query('SELECT * FROM users WHERE telegram_user_id = $1', [userId]);
  return fresh.rows[0];
}

function progressFor(user) {
  return {
    referrals: Math.max(0, Math.floor(number(user.referrals))),
    ads: Math.max(0, Math.floor(number(user.ads))),
    deposit: Math.max(0, number(user.deposit)),
  };
}

function unlocksFor(user, settings) {
  const progress = progressFor(user);
  return Object.entries(settings.houses || HOUSES)
    .filter(([, house]) => {
      if (!house.unlock) return true;
      return progress[house.unlock[0]] >= number(house.unlock[1]);
    })
    .map(([id]) => Number(id));
}

async function ensureHouseUnlocks(user, settings, now, client) {
  for (const houseId of unlocksFor(user, settings)) {
    await client.query(
      `INSERT INTO house_unlocks(telegram_user_id, house_id, unlocked_at)
       VALUES($1, $2, $3) ON CONFLICT DO NOTHING`,
      [user.telegram_user_id, houseId, now]
    );
  }
}

async function settleHouseProduction(user, settings, now, client) {
  await ensureHouseUnlocks(user, settings, now, client);
  const unlocks = await client.query(
    `SELECT hu.house_id, hu.unlocked_at, hp.last_settled_at
     FROM house_unlocks hu
     LEFT JOIN house_production hp
       ON hp.telegram_user_id = hu.telegram_user_id AND hp.house_id = hu.house_id
     WHERE hu.telegram_user_id = $1`,
    [user.telegram_user_id]
  );
  const interval = integer(settings.house_production_interval_ms) || 120000;
  let earned = 0;
  for (const row of unlocks.rows) {
    const house = (settings.houses || HOUSES)[row.house_id];
    const rate = number(house?.production);
    if (!rate) continue;
    const last = Math.max(number(row.last_settled_at), number(row.unlocked_at));
    const units = Math.floor(Math.max(0, now - last) / interval);
    const settledAt = units ? last + units * interval : last;
    await client.query(
      `INSERT INTO house_production(telegram_user_id, house_id, last_settled_at)
       VALUES($1, $2, $3)
       ON CONFLICT(telegram_user_id, house_id) DO UPDATE SET last_settled_at = $3`,
      [user.telegram_user_id, row.house_id, settledAt]
    );
    if (units) {
      const amount = units * rate;
      earned += amount;
      await client.query(
        `UPDATE users SET balance = balance + $1, updated_at = $2
         WHERE telegram_user_id = $3`,
        [amount, now, user.telegram_user_id]
      );
      await logAudit(user.telegram_user_id, 'house_production_settled', {
        houseId: row.house_id,
        units,
        amount,
      }, client);
    }
  }
  return earned;
}

async function ensureCollectibles(user, settings, now, client) {
  await client.query(
    `DELETE FROM collectible_coins
     WHERE telegram_user_id = $1 AND collected_at IS NULL AND expires_at <= $2`,
    [user.telegram_user_id, now]
  );
  const active = await client.query(
    `SELECT COUNT(*)::int AS count FROM collectible_coins
     WHERE telegram_user_id = $1 AND collected_at IS NULL AND expires_at > $2`,
    [user.telegram_user_id, now]
  );
  const maxCoins = integer(settings.max_active_coins) || 10;
  const currentCount = number(active.rows[0].count);
  const lastSpawn = number(user.last_coin_spawn_at);
  const interval = integer(settings.coin_spawn_interval_ms) || 15000;
  const due = !lastSpawn ? maxCoins : Math.floor(Math.max(0, now - lastSpawn) / interval);
  const count = Math.min(maxCoins - currentCount, Math.max(0, due));
  for (let index = 0; index < count; index += 1) {
    await client.query(
      `INSERT INTO collectible_coins(id, telegram_user_id, value, spawned_at, expires_at)
       VALUES($1, $2, $3, $4, $5)`,
      [
        crypto.randomUUID(),
        user.telegram_user_id,
        number(settings.coin_value),
        now,
        now + (integer(settings.coin_lifetime_ms) || 120000),
      ]
    );
  }
  if (count) {
    await client.query(
      'UPDATE users SET last_coin_spawn_at = $1, updated_at = $1 WHERE telegram_user_id = $2',
      [now, user.telegram_user_id]
    );
  }
}

async function stateInsideTransaction(userId, client, now) {
  const settings = await getSettings(client);
  let user = await getOrCreateUser(userId, {}, client);
  await settleHouseProduction(user, settings, now, client);
  user = (await client.query('SELECT * FROM users WHERE telegram_user_id = $1', [userId])).rows[0];
  await ensureCollectibles(user, settings, now, client);
  user = (await client.query('SELECT * FROM users WHERE telegram_user_id = $1', [userId])).rows[0];
  const coins = await client.query(
    `SELECT id, value, spawned_at, expires_at
     FROM collectible_coins
     WHERE telegram_user_id = $1 AND collected_at IS NULL AND expires_at > $2
     ORDER BY spawned_at ASC`,
    [userId, now]
  );
  return {
    telegramUserId: String(user.telegram_user_id),
    clientId: String(user.telegram_user_id),
    balance: Number(number(user.balance).toFixed(8)),
    reservedBalance: Number(number(user.reserved_balance).toFixed(8)),
    progress: progressFor(user),
    unlockedHouses: unlocksFor(user, settings),
    activeHouseId: 1,
    tonAddress: user.ton_address || '',
    collectibles: coins.rows.map(coin => ({
      id: coin.id,
      value: number(coin.value),
      spawnedAt: number(coin.spawned_at),
      expiresAt: number(coin.expires_at),
    })),
    config: safeConfig(settings),
    serverTime: now,
  };
}

async function readState(userId, context = {}) {
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    const state = await stateInsideTransaction(user.telegram_user_id, client, now);
    await client.query('COMMIT');
    return state;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function writeState(userId, body = {}, context = {}) {
  const forbidden = ['balance', 'progress', 'referrals', 'ads', 'deposit', 'unlockedHouses', 'activeHouseId'];
  if (forbidden.some(key => Object.prototype.hasOwnProperty.call(body, key))) {
    throw appError('Client-controlled economic state is not accepted', 400);
  }
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    if (body.tonAddress !== undefined) {
      const address = String(body.tonAddress || '').trim();
      if (address.length < 20 || address.length > 200) throw appError('Enter a valid TON address', 400);
      await client.query(
        'UPDATE users SET ton_address = $1, updated_at = $2 WHERE telegram_user_id = $3',
        [address || null, now, user.telegram_user_id]
      );
      await logAudit(user.telegram_user_id, 'wallet_updated', {}, client);
    }
    const state = await stateInsideTransaction(user.telegram_user_id, client, now);
    await client.query('COMMIT');
    return state;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function readIdempotency(client, userId, key, requestBody) {
  if (!key) throw appError('Idempotency-Key is required', 400);
  if (String(key).length > 160) throw appError('Invalid Idempotency-Key', 400);
  const result = await client.query(
    `SELECT request_hash, response FROM idempotency_keys
     WHERE telegram_user_id = $1 AND idempotency_key = $2 FOR UPDATE`,
    [userId, key]
  );
  if (!result.rows.length) {
    await client.query(
      `INSERT INTO idempotency_keys(telegram_user_id, idempotency_key, request_hash)
       VALUES($1, $2, $3)`,
      [userId, key, hashRequest(requestBody)]
    );
    return null;
  }
  if (result.rows[0].request_hash !== hashRequest(requestBody)) {
    throw appError('The idempotency key was reused for a different request', 409);
  }
  return result.rows[0].response || null;
}

async function saveIdempotency(client, userId, key, response) {
  await client.query(
    `UPDATE idempotency_keys SET response = $1::jsonb
     WHERE telegram_user_id = $2 AND idempotency_key = $3`,
    [JSON.stringify(response), userId, key]
  );
}

async function collectCoin(userId, coinId, idempotencyKey, context = {}) {
  if (!coinId || String(coinId).length > 100) throw appError('A valid server coin ID is required', 400);
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    const cached = await readIdempotency(client, user.telegram_user_id, idempotencyKey, { coinId });
    if (cached) {
      await client.query('COMMIT');
      return cached;
    }
    const coinResult = await client.query(
      `SELECT * FROM collectible_coins
       WHERE id = $1 AND telegram_user_id = $2 FOR UPDATE`,
      [String(coinId), user.telegram_user_id]
    );
    const coin = coinResult.rows[0];
    if (!coin || coin.collected_at || number(coin.expires_at) <= now) {
      throw appError('This coin is not available', 409);
    }
    const settings = await getSettings(client);
    await settleHouseProduction(user, settings, now, client);
    const unlocked = unlocksFor(user, settings);
    const multiplier = unlocked.reduce((total, houseId) => {
      const house = settings.houses[houseId];
      return total + number(house?.coinMultiplier);
    }, 0);
    const amount = number(coin.value) * (1 + multiplier);
    await client.query(
      'UPDATE collectible_coins SET collected_at = $1 WHERE id = $2 AND collected_at IS NULL',
      [now, coin.id]
    );
    await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = $2 WHERE telegram_user_id = $3',
      [amount, now, user.telegram_user_id]
    );
    await logAudit(user.telegram_user_id, 'coin_collected', {
      coinId: coin.id,
      baseValue: number(coin.value),
      multiplier,
      amount,
    }, client);
    const response = await stateInsideTransaction(user.telegram_user_id, client, now);
    await saveIdempotency(client, user.telegram_user_id, idempotencyKey, response);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function startAd(userId, context = {}) {
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    const settings = await getSettings(client);
    const cooldown = integer(settings.ad_cooldown_ms);
    if (user.last_ad_completed_at && now - number(user.last_ad_completed_at) < cooldown) {
      throw appError('Ad cooldown is still active', 429);
    }
    const daily = await client.query(
      `SELECT COUNT(*)::int AS count FROM ad_completions
       WHERE telegram_user_id = $1 AND completed_at >= $2`,
      [user.telegram_user_id, now - 86400000]
    );
    if (number(daily.rows[0].count) >= integer(settings.ad_daily_limit)) {
      throw appError('Daily ad limit reached', 429);
    }
    const pending = await client.query(
      `SELECT id, expires_at FROM ad_sessions
       WHERE telegram_user_id = $1 AND status = 'pending' AND expires_at > $2
       ORDER BY started_at DESC LIMIT 1`,
      [user.telegram_user_id, now]
    );
    if (pending.rows.length) {
      await client.query('COMMIT');
      return {
        sessionId: pending.rows[0].id,
        expiresAt: number(pending.rows[0].expires_at),
        cooldownMs: cooldown,
      };
    }
    const sessionId = crypto.randomUUID();
    const expiresAt = now + integer(settings.ad_session_ttl_ms);
    await client.query(
      `INSERT INTO ad_sessions(id, telegram_user_id, reward, started_at, expires_at)
       VALUES($1, $2, $3, $4, $5)`,
      [sessionId, user.telegram_user_id, number(settings.ad_reward), now, expiresAt]
    );
    await logAudit(user.telegram_user_id, 'ad_started', { sessionId }, client);
    await client.query('COMMIT');
    return { sessionId, expiresAt, cooldownMs: cooldown };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function verifyAdSession(sessionId, providerEventId, client = pool) {
  const now = Date.now();
  const result = await client.query(
    `UPDATE ad_sessions
     SET status = 'verified', provider_event_id = $1, provider_verified_at = $2
     WHERE id = $3 AND status = 'pending' AND expires_at > $2
     RETURNING telegram_user_id`,
    [providerEventId, now, sessionId]
  );
  return Boolean(result.rows.length);
}

async function completeAd(userId, sessionId, idempotencyKey, context = {}) {
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    const cached = await readIdempotency(client, user.telegram_user_id, idempotencyKey, { sessionId });
    if (cached) {
      await client.query('COMMIT');
      return cached;
    }
    const sessionResult = await client.query(
      `SELECT * FROM ad_sessions WHERE id = $1 AND telegram_user_id = $2 FOR UPDATE`,
      [sessionId, user.telegram_user_id]
    );
    const session = sessionResult.rows[0];
    if (!session || number(session.expires_at) <= now) throw appError('Ad session expired', 409);
    if (session.status !== 'verified') {
      throw appError('The ad provider has not verified this session', 409);
    }
    const reward = number(session.reward);
    await client.query(
      `UPDATE ad_sessions SET status = 'completed', completed_at = $1
       WHERE id = $2 AND status = 'verified'`,
      [now, session.id]
    );
    await client.query(
      `INSERT INTO ad_completions(telegram_user_id, ad_session_id, reward, completed_at)
       VALUES($1, $2, $3, $4)`,
      [user.telegram_user_id, session.id, reward, now]
    );
    await client.query(
      `UPDATE users SET balance = balance + $1, ads = ads + 1,
       last_ad_completed_at = $2, updated_at = $2
       WHERE telegram_user_id = $3`,
      [reward, now, user.telegram_user_id]
    );
    await logAudit(user.telegram_user_id, 'ad_completed', { sessionId: session.id, reward }, client);
    const response = await stateInsideTransaction(user.telegram_user_id, client, now);
    await saveIdempotency(client, user.telegram_user_id, idempotencyKey, response);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createWithdrawal(userId, idempotencyKey, context = {}) {
  const client = await pool.connect();
  const now = Date.now();
  try {
    await client.query('BEGIN');
    const user = await getOrCreateUser(userId, context, client);
    const cached = await readIdempotency(client, user.telegram_user_id, idempotencyKey, {});
    if (cached) {
      await client.query('COMMIT');
      return cached;
    }
    const settings = await getSettings(client);
    const amount = number(user.balance);
    const minimum = number(settings.min_withdrawal);
    const fee = number(settings.withdrawal_fee);
    if (!user.ton_address) throw appError('Set your TON wallet first', 400);
    if (amount < minimum) throw appError(`Minimum withdrawal is ${minimum} USDT`, 400);
    const withdrawal = await client.query(
      `INSERT INTO withdrawals(telegram_user_id, amount, fee, ton_address)
       VALUES($1, $2, $3, $4)
       RETURNING id, amount, fee, ton_address, status, created_at`,
      [user.telegram_user_id, amount, fee, user.ton_address]
    );
    await client.query(
      `UPDATE users SET balance = 0, reserved_balance = reserved_balance + $1,
       updated_at = $2 WHERE telegram_user_id = $3`,
      [amount, now, user.telegram_user_id]
    );
    await logAudit(user.telegram_user_id, 'withdrawal_requested', {
      withdrawalId: withdrawal.rows[0].id,
      amount,
      fee,
    }, client);
    const response = withdrawal.rows[0];
    await saveIdempotency(client, user.telegram_user_id, idempotencyKey, response);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listUserWithdrawals(userId, limit = 10) {
  const result = await pool.query(
    `SELECT id, amount, fee, ton_address, status, created_at, reviewed_at
     FROM withdrawals WHERE telegram_user_id = $1 ORDER BY id DESC LIMIT $2`,
    [normalizedUserId(userId), Math.min(50, Math.max(1, integer(limit) || 10))]
  );
  return result.rows;
}

async function setTonAddress(userId, address, context = {}) {
  return writeState(userId, { tonAddress: address }, context);
}

module.exports = {
  HOUSES,
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
  setTonAddress,
};