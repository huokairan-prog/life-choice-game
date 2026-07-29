PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  is_minor INTEGER NOT NULL DEFAULT 0 CHECK (is_minor IN (0, 1)),
  monthly_minor_limit_cents INTEGER NOT NULL DEFAULT 20000 CHECK (monthly_minor_limit_cents >= 0),
  total_recharge_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_recharge_cents >= 0),
  vip_level INTEGER NOT NULL DEFAULT 0 CHECK (vip_level BETWEEN 0 AND 7),
  first_recharge_claimed INTEGER NOT NULL DEFAULT 0 CHECK (first_recharge_claimed IN (0, 1)),
  free_growth_points INTEGER NOT NULL DEFAULT 8 CHECK (free_growth_points >= 0),
  daily_reward_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  growth_coins INTEGER NOT NULL DEFAULT 0 CHECK (growth_coins >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_attributes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height INTEGER NOT NULL CHECK (height BETWEEN 150 AND 220),
  weight INTEGER NOT NULL CHECK (weight BETWEEN 40 AND 160),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
  speed INTEGER NOT NULL CHECK (speed BETWEEN 0 AND 100),
  vertical INTEGER NOT NULL CHECK (vertical BETWEEN 0 AND 100),
  basketball INTEGER NOT NULL CHECK (basketball BETWEEN 0 AND 100),
  intelligence INTEGER NOT NULL CHECK (intelligence BETWEEN 0 AND 100),
  emotional_intelligence INTEGER NOT NULL CHECK (emotional_intelligence BETWEEN 0 AND 100),
  charm INTEGER NOT NULL CHECK (charm BETWEEN 0 AND 100),
  health INTEGER NOT NULL CHECK (health BETWEEN 0 AND 100),
  wealth INTEGER NOT NULL CHECK (wealth BETWEEN 0 AND 100),
  luck INTEGER NOT NULL CHECK (luck BETWEEN 0 AND 100),
  social INTEGER NOT NULL CHECK (social BETWEEN 0 AND 100),
  english INTEGER NOT NULL CHECK (english BETWEEN 0 AND 100),
  career INTEGER NOT NULL CHECK (career BETWEEN 0 AND 100),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at TEXT NOT NULL
);

-- A character's free creation choices may seed the growth profile once.  Paid upgrades
-- are never seeded from the browser after this immutable first write.
CREATE TABLE IF NOT EXISTS growth_initializations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_digest TEXT NOT NULL,
  seeded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS growth_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_json TEXT NOT NULL,
  quote_json TEXT NOT NULL,
  attribute_version INTEGER NOT NULL,
  wallet_version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

-- Initial game cash is selected from a server-owned fixed catalog.  It is kept
-- apart from character creation so a browser supplied `resources.cash` can
-- never become the authoritative starting balance.
CREATE TABLE IF NOT EXISTS initial_cash_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  initial_cash INTEGER NOT NULL CHECK (initial_cash >= 0),
  coins_cost INTEGER NOT NULL CHECK (coins_cost >= 0),
  wallet_version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS initial_cash_selections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  initial_cash INTEGER NOT NULL CHECK (initial_cash >= 0),
  coins_spent INTEGER NOT NULL DEFAULT 0 CHECK (coins_spent >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('FREE_BASE', 'COIN_PURCHASE')),
  quote_id TEXT UNIQUE REFERENCES initial_cash_quotes(id),
  transaction_id TEXT UNIQUE,
  selected_at TEXT NOT NULL,
  locked_at TEXT
);

CREATE TABLE IF NOT EXISTS initial_cash_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id TEXT NOT NULL UNIQUE REFERENCES initial_cash_quotes(id),
  option_id TEXT NOT NULL,
  initial_cash INTEGER NOT NULL CHECK (initial_cash >= 0),
  coins_spent INTEGER NOT NULL CHECK (coins_spent >= 0),
  wallet_balance_after INTEGER NOT NULL CHECK (wallet_balance_after >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, operation, idempotency_key)
);

CREATE TABLE IF NOT EXISTS progression_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id TEXT NOT NULL REFERENCES growth_quotes(id),
  attribute_key TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  free_points_used INTEGER NOT NULL DEFAULT 0,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  wallet_balance_after INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  out_trade_no TEXT NOT NULL UNIQUE,
  product_sku TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  base_coins INTEGER NOT NULL CHECK (base_coins > 0),
  bonus_coins INTEGER NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
  total_coins INTEGER NOT NULL DEFAULT 0 CHECK (total_coins >= 0),
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CLOSED')),
  wechat_transaction_id TEXT UNIQUE,
  prepay_id TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_notifications (
  id TEXT PRIMARY KEY,
  out_trade_no TEXT NOT NULL,
  wechat_transaction_id TEXT NOT NULL UNIQUE,
  raw_payload TEXT NOT NULL,
  received_at TEXT NOT NULL,
  verified_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('TOPUP', 'UPGRADE', 'ROUTE', 'LIFE_START', 'VIP_DAILY', 'REFUND')),
  coin_delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, reference_type, reference_id, kind)
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, entitlement_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_user_expiry ON growth_quotes(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_initial_cash_quotes_user_expiry ON initial_cash_quotes(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_progression_user_created ON progression_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_initial_cash_transactions_user_created ON initial_cash_transactions(user_id, created_at DESC);
