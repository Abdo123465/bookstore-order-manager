CREATE TABLE IF NOT EXISTS book_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO book_types (id, name)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'عربي'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'لغات');
