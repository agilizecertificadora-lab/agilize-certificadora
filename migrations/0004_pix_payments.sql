ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN payment_txid TEXT;
ALTER TABLE orders ADD COLUMN payment_amount_cents INTEGER;
ALTER TABLE orders ADD COLUMN payment_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN payment_notes TEXT;

CREATE TABLE IF NOT EXISTS payment_settings (
  id TEXT PRIMARY KEY,
  pix_key TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_city TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
