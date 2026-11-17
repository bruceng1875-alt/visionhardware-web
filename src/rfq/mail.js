// Adapted from the user-owned NEXKITRA inquiry implementation.
class MailError extends Error {
  constructor(code, retryable, retryAfter = 0) {
    super(code);
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}
function createMailProvider(env, fetcher = fetch) {
  return {
    async send(inquiry) {
      if (env.ENVIRONMENT === "local" && env.MAIL_PROVIDER === "mock") return { id: `mock-${inquiry.id}`, simulated: true };
      if (env.ENVIRONMENT === "local" && env.MAIL_PROVIDER === "mock-fail") throw new MailError("MOCK_FAILURE", true);
      // Cloud staging must never expand delivery beyond the confirmed test inbox.
      if (env.ENVIRONMENT === 'staging' && (!env.STAGING_NOTIFICATION_TO || env.NOTIFICATION_TO?.toLowerCase() !== env.STAGING_NOTIFICATION_TO.toLowerCase() || env.MAIL_FROM !== 'Vision Hardware Test <onboarding@resend.dev>')) throw new MailError('STAGING_MAIL_TARGET_INVALID', false);
      if (env.ENVIRONMENT === "local" || !["staging", "production"].includes(env.ENVIRONMENT ?? "") || env.ALLOW_EMAIL_SEND !== "true" || env.MAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.MAIL_FROM || !env.NOTIFICATION_TO || /[\r\n]/.test(env.MAIL_FROM + env.NOTIFICATION_TO + inquiry.email)) throw new MailError("MAIL_NOT_CONFIGURED", false);
      let response;
      try {
        response = await fetcher("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(1e4),
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `inquiry/${inquiry.id}` },
          body: JSON.stringify({
            from: env.MAIL_FROM,
            to: [env.NOTIFICATION_TO],
            reply_to: inquiry.email,
            subject: `${env.ENVIRONMENT === 'staging' ? '[TEST] ' : ''}Vision Hardware inquiry ${inquiry.id}`,
            text: [`Reference: ${inquiry.id}`, `Created: ${inquiry.created_at}`, `Name: ${inquiry.name}`, `Company: ${inquiry.organisation}`, `Country: ${inquiry.country}`, `Email: ${inquiry.email}`, `Product: ${inquiry.product_interest}`, `Quantity: ${inquiry.quantity}`, `Source: ${inquiry.source_page}`, "", inquiry.message].join("\n")
          })
        });
      } catch {
        throw new MailError("MAIL_NETWORK", true);
      }
      if (!response.ok) {
        let providerCode='UNKNOWN';
        try { const failure=await response.json(); if(typeof failure?.name==='string' && /^[a-z_]{1,64}$/i.test(failure.name))providerCode=failure.name.toUpperCase(); } catch {}
        const retryHeader = response.headers.get("retry-after");
        const seconds = retryHeader ? Number(retryHeader) : 0;
        const retryAfter = Number.isFinite(seconds) ? Math.max(0, seconds * 1e3) : Math.max(0, Date.parse(retryHeader ?? "") - Date.now()) || 0;
        throw new MailError(`MAIL_${response.status}_${providerCode}`, response.status === 429 || response.status >= 500, retryAfter);
      }
      try {
        const body = await response.json();
        if (typeof body.id !== "string" || !body.id) throw new Error("missing id");
        return { id: body.id, simulated: false };
      } catch {
        throw new MailError("MAIL_UNKNOWN_RESULT", true);
      }
    }
  };
}
export {
  MailError,
  createMailProvider
};
