CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  picture TEXT,
  plan TEXT DEFAULT 'free',
  expires_at INTEGER,
  last_login INTEGER
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  style TEXT,
  input TEXT,
  result TEXT,
  created_at INTEGER,
  FOREIGN KEY(user_email) REFERENCES users(email)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  order_id TEXT,
  plan TEXT,
  amount TEXT,
  currency TEXT DEFAULT 'USD',
  status TEXT,
  provider TEXT DEFAULT 'paypal',
  created_at INTEGER,
  FOREIGN KEY(user_email) REFERENCES users(email)
);
