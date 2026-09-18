CREATE TABLE IF NOT EXISTS resellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  accounting_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON resellers(status, created_at DESC);
CREATE TABLE IF NOT EXISTS reseller_login_codes (id TEXT PRIMARY KEY,email TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reseller_sessions (id TEXT PRIMARY KEY,reseller_id TEXT NOT NULL,email TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reseller_prices (product_id TEXT PRIMARY KEY,price_cents INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL);
ALTER TABLE orders ADD COLUMN reseller_id TEXT;
ALTER TABLE orders ADD COLUMN reseller_name TEXT;
INSERT OR IGNORE INTO reseller_prices(product_id,price_cents,active,updated_at,updated_by)
SELECT product_id,CASE WHEN product_id='cert-22' THEN 16000 ELSE sale_price_cents END,active,datetime('now'),'system' FROM partner_products WHERE sale_price_cents IS NOT NULL;
