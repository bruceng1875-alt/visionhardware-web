// Adapted from the user-owned NEXKITRA inquiry implementation.
import { ApiError } from "./types.js";
import { CONSENT_VERSION } from "./validation.js";
class InquiryRepository {
  constructor(db) {
    this.db = db;
  }
  async save(input, hash) {
    const id = crypto.randomUUID();
    const created = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.batch([
        this.db.prepare(`INSERT INTO inquiries
          (id,created_at,name,email,organisation,country,product_interest,quantity,message,source_page,consent_version,idempotency_key,payload_hash)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING`).bind(id, created, input.name, input.email, input.organisation, input.country, input.productInterest, input.estimatedQuantity, input.message, input.sourcePage, CONSENT_VERSION, input.idempotencyKey, hash),
        this.db.prepare(`INSERT INTO notification_outbox (inquiry_id,next_attempt_at)
          SELECT id,? FROM inquiries WHERE id=?`).bind(Date.now(), id)
      ]);
      const row = await this.db.prepare("SELECT id,payload_hash FROM inquiries WHERE idempotency_key=?").bind(input.idempotencyKey).first();
      if (!row) throw new Error("missing row");
      if (row.payload_hash !== hash) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This submission key was already used for different content.");
      return { reference: row.id, duplicate: row.id !== id };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "STORAGE_FAILED", "We could not confirm receipt. Please retry with the same submission.");
    }
  }
}
export {
  InquiryRepository
};
