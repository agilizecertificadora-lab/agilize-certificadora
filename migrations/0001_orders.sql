CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  person TEXT NOT NULL,
  certificate_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  price_cents INTEGER,
  purpose TEXT NOT NULL,
  holder TEXT NOT NULL,
  cpf TEXT NOT NULL,
  birth TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnpj TEXT,
  company TEXT,
  trade_name TEXT,
  address_json TEXT,
  mode TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_slot ON orders(appointment_date,appointment_time,mode) WHERE status NOT IN ('cancelled','rejected');
CREATE INDEX IF NOT EXISTS idx_orders_protocol ON orders(protocol);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
