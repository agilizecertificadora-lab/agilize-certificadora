CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  document TEXT NOT NULL UNIQUE,
  person TEXT NOT NULL,
  holder TEXT NOT NULL,
  cpf TEXT,
  birth TEXT,
  email TEXT,
  phone TEXT,
  cnpj TEXT,
  company TEXT,
  trade_name TEXT,
  address_json TEXT,
  city TEXT,
  notes TEXT,
  source TEXT NOT NULL,
  first_order_protocol TEXT,
  last_order_protocol TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_name ON customer_profiles(holder);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles(phone);

INSERT OR IGNORE INTO customer_profiles
  (id,document,person,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,city,notes,source,first_order_protocol,last_order_protocol,created_at,updated_at)
SELECT lower(hex(randomblob(16))),CASE WHEN length(cnpj)=14 THEN cnpj ELSE cpf END,person,holder,cpf,birth,lower(email),phone,cnpj,company,trade_name,address_json,
  coalesce(json_extract(address_json,'$.city'),''),'','order',protocol,protocol,created_at,created_at
FROM orders
WHERE (length(cnpj)=14 OR length(cpf)=11)
ORDER BY datetime(created_at) DESC;

INSERT OR IGNORE INTO customer_profiles
  (id,document,person,holder,cpf,birth,email,phone,cnpj,company,trade_name,address_json,city,notes,source,created_at,updated_at)
SELECT lower(hex(randomblob(16))),replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ',''),
  CASE WHEN length(replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ',''))=14 THEN 'pj' ELSE 'pf' END,
  name,
  CASE WHEN length(replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ',''))=11 THEN replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ','') ELSE '' END,
  '',lower(email),phone,
  CASE WHEN length(replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ',''))=14 THEN replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ','') ELSE '' END,
  CASE WHEN length(replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ',''))=14 THEN name ELSE '' END,
  '','',city,'Importado da lista de renovações','renewal',created_at,updated_at
FROM renewal_customers
WHERE length(replace(replace(replace(replace(document,'.',''),'-',''),'/',''),' ','')) IN (11,14)
ORDER BY datetime(updated_at) DESC;
