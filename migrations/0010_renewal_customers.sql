CREATE TABLE IF NOT EXISTS renewal_customers (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  source_file TEXT,
  name TEXT NOT NULL,
  document TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  product TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  referral TEXT,
  contact_checked INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'review',
  last_contact_at TEXT,
  next_follow_up_at TEXT,
  notes TEXT,
  renewal_token TEXT NOT NULL UNIQUE,
  email_sent_at TEXT,
  whatsapp_opened_at TEXT,
  order_protocol TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(document, product, expires_at)
);
CREATE INDEX IF NOT EXISTS idx_renewal_expiry ON renewal_customers(expires_at);
CREATE INDEX IF NOT EXISTS idx_renewal_status ON renewal_customers(status, expires_at);

CREATE TABLE IF NOT EXISTS renewal_contact_log (
  id TEXT PRIMARY KEY,
  renewal_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  result TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (renewal_id) REFERENCES renewal_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_renewal_log_customer ON renewal_contact_log(renewal_id, created_at DESC);
