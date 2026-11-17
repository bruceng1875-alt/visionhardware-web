PRAGMA foreign_keys = ON;

CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT NOT NULL,
  country TEXT NOT NULL,
  product_interest TEXT NOT NULL CHECK (product_interest IN ('metal-hardware','buttons-fasteners','zippers-pullers','buckles-adjusters','labels-patches','webbings-tapes','cords-drawstrings','custom-accessories')),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  message TEXT NOT NULL,
  source_page TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','closed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL
);

CREATE TABLE notification_outbox (
  inquiry_id TEXT PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','simulated','failed','needs_review')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  first_attempt_at INTEGER,
  lease_until INTEGER,
  lease_token TEXT,
  provider_message_id TEXT,
  last_error_code TEXT,
  accepted_at TEXT
);
CREATE INDEX notification_due ON notification_outbox(status, next_attempt_at);
CREATE INDEX inquiries_created ON inquiries(created_at);
