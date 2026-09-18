CREATE TABLE IF NOT EXISTS reseller_custom_prices (
  reseller_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (reseller_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_reseller_custom_prices_reseller ON reseller_custom_prices(reseller_id);
INSERT OR IGNORE INTO reseller_custom_prices(reseller_id,product_id,price_cents,active,updated_at,updated_by)
SELECT x.id,p.product_id,p.price_cents,p.active,datetime('now'),'migration' FROM resellers x CROSS JOIN reseller_prices p;
