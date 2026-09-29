CREATE TABLE IF NOT EXISTS commercial_prospects (
  siret TEXT PRIMARY KEY,
  siren TEXT NOT NULL,
  name TEXT NOT NULL,
  naf TEXT,
  activity_group TEXT,
  company_category TEXT,
  department TEXT NOT NULL,
  postal_code TEXT,
  city TEXT,
  address TEXT,
  workforce_code TEXT,
  workforce_label TEXT,
  is_headquarters INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  excluded_known INTEGER NOT NULL DEFAULT 0,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  insee_updated_at INTEGER,
  raw_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_commercial_prospects_scope ON commercial_prospects(department,active,excluded_known);
CREATE INDEX IF NOT EXISTS idx_commercial_prospects_siren ON commercial_prospects(siren);
CREATE INDEX IF NOT EXISTS idx_commercial_prospects_naf ON commercial_prospects(naf);
CREATE INDEX IF NOT EXISTS idx_commercial_prospects_seen ON commercial_prospects(first_seen_at);

CREATE TABLE IF NOT EXISTS commercial_prospect_refresh (
  id INTEGER PRIMARY KEY CHECK(id=1),
  started_at INTEGER,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'never',
  establishments_seen INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

INSERT OR IGNORE INTO commercial_prospect_refresh(id,status) VALUES(1,'never');
