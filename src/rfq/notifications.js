// Adapted from the user-owned NEXKITRA inquiry implementation.
import { createMailProvider, MailError } from "./mail.js";
const MAX_ATTEMPTS = 5;
const DEDUP_WINDOW = 23 * 60 * 60 * 1e3;
const delays = [6e4, 3e5, 9e5, 36e5];
async function processNotifications(env) {
  if (env.INQUIRIES_ENABLED !== "true") return;
  const now = Date.now();
  await env.DB.prepare(`UPDATE notification_outbox SET status='needs_review',last_error_code='DELIVERY_UNCERTAIN',lease_token=NULL,lease_until=NULL
    WHERE (status='pending' OR (status='sending' AND lease_until<=?))
    AND (attempts>=? OR first_attempt_at<=?)`).bind(now, MAX_ATTEMPTS, now - DEDUP_WINDOW).run();
  const due = await env.DB.prepare(`SELECT inquiry_id FROM notification_outbox
    WHERE (status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?)
    ORDER BY next_attempt_at LIMIT 10`).bind(now, now).all();
  for (const { inquiry_id: id } of due.results) {
    const lease = crypto.randomUUID();
    const row = await env.DB.prepare(`UPDATE notification_outbox SET status='sending',lease_token=?,lease_until=?,attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?)
      WHERE inquiry_id=? AND attempts<? AND (first_attempt_at IS NULL OR first_attempt_at>?)
      AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?)) RETURNING attempts`).bind(lease, now + 6e4, now, id, MAX_ATTEMPTS, now - DEDUP_WINDOW, now, now).first();
    if (!row) continue;
    const inquiry = await env.DB.prepare("SELECT * FROM inquiries WHERE id=?").bind(id).first();
    if (!inquiry) continue;
    let result;
    try {
      result = await createMailProvider(env).send(inquiry);
    } catch (error) {
      const failure = error instanceof MailError ? error : new MailError("MAIL_UNKNOWN", true);
      const status = !failure.retryable ? "failed" : row.attempts >= MAX_ATTEMPTS ? "needs_review" : "pending";
      await env.DB.prepare(`UPDATE notification_outbox SET status=?,last_error_code=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL WHERE inquiry_id=? AND lease_token=?`).bind(status, failure.code, Date.now() + Math.max(delays[Math.min(row.attempts - 1, 3)], failure.retryAfter), id, lease).run();
      continue;
    }
    await env.DB.prepare(`UPDATE notification_outbox SET status=?,provider_message_id=?,accepted_at=?,last_error_code=NULL,lease_token=NULL,lease_until=NULL WHERE inquiry_id=? AND lease_token=?`).bind(result.simulated ? "simulated" : "accepted", result.id, (/* @__PURE__ */ new Date()).toISOString(), id, lease).run();
  }
}
async function safelyProcessNotifications(env) {
  try {
    await processNotifications(env);
  } catch {
    console.error(JSON.stringify({ event: "notification_processing_failed", code: "OUTBOX_UNAVAILABLE" }));
  }
}
export {
  processNotifications,
  safelyProcessNotifications
};
