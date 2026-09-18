CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id TEXT PRIMARY KEY,
  contact_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  excluded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  last_activity TEXT,
  source_file TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_name ON whatsapp_contacts(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_status ON whatsapp_contacts(status);
