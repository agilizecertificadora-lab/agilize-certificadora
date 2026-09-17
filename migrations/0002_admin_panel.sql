ALTER TABLE orders ADD COLUMN syngulari_protocol TEXT;
ALTER TABLE orders ADD COLUMN video_url TEXT;
ALTER TABLE orders ADD COLUMN admin_notes TEXT;

CREATE TABLE IF NOT EXISTS admin_login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_login_email ON admin_login_codes(email, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_session_token ON admin_sessions(token_hash);
