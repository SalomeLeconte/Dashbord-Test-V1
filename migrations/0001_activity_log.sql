CREATE TABLE IF NOT EXISTS activity_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event TEXT NOT NULL,
 email TEXT,
 role TEXT,
 path TEXT,
 ip_hash TEXT,
 user_agent TEXT,
 details TEXT,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_email ON activity_log(email, created_at DESC);
