CREATE TABLE IF NOT EXISTS customer_login_codes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_login_order ON customer_login_codes(order_id, email, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_session_token ON customer_sessions(token_hash);

ALTER TABLE orders ADD COLUMN payment_proof_name TEXT;
ALTER TABLE orders ADD COLUMN payment_proof_type TEXT;
ALTER TABLE orders ADD COLUMN payment_proof_data TEXT;
ALTER TABLE orders ADD COLUMN payment_proof_uploaded_at TEXT;
