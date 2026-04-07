CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  picture TEXT,
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
