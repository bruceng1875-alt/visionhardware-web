-- Preserve existing inquiries and notification states while expanding allowed categories.
CREATE TABLE inquiries_expanded (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT NOT NULL,
  country TEXT NOT NULL,
  product_interest TEXT NOT NULL CHECK (product_interest IN ('metal-hardware','buttons-fasteners','zippers-pullers','buckles-adjusters','labels-patches','webbings-tapes','cords-drawstrings','custom-accessories','shoe-buckles','chains','zipper-pullers','pins','eyelets','snap-buttons','rivets','jeans-buttons','strap-adjusters','sew-on-buttons','sew-on-labels','four-hole-buttons','metal-labels','metal-leather-labels','charms','hollow-tubes','concealed-snaps','six-part-snaps','hot-melt-labels','clips','cord-ends','insert-buckles')),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  message TEXT NOT NULL,
  source_page TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','closed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL
);

CREATE TABLE notification_outbox_expanded (
  inquiry_id TEXT PRIMARY KEY REFERENCES inquiries_expanded(id) ON DELETE CASCADE,
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

INSERT INTO inquiries_expanded SELECT * FROM inquiries;
INSERT INTO notification_outbox_expanded SELECT * FROM notification_outbox;
DROP TABLE notification_outbox;
DROP TABLE inquiries;
ALTER TABLE inquiries_expanded RENAME TO inquiries;
ALTER TABLE notification_outbox_expanded RENAME TO notification_outbox;
CREATE INDEX notification_due ON notification_outbox(status,next_attempt_at);
CREATE INDEX inquiries_created ON inquiries(created_at);
