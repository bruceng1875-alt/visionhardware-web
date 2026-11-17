// Adapted from the user-owned NEXKITRA inquiry implementation.
import { ApiError } from "./types.js";
import { allowedOrigin, checkConfiguration, rateLimit, verifyTurnstile } from "./antispam.js";
import { payloadHash, readJson, validate } from "./validation.js";
import { InquiryRepository } from "./repository.js";
import { safelyProcessNotifications } from "./notifications.js";
async function handleRequest(request, env, ctx) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff" });
  const respond = (body, status) => new Response(JSON.stringify(body), { status, headers });
  try {
    if (new URL(request.url).pathname !== "/api/rfq") throw new ApiError(404, "NOT_FOUND", "Endpoint not found.");
    if (!["POST", "OPTIONS"].includes(request.method)) {
      headers.set("Allow", "POST, OPTIONS");
      throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use POST.");
    }
    headers.set("Access-Control-Allow-Origin", allowedOrigin(request, env));
    if (request.method === "OPTIONS") {
      if (request.headers.get("access-control-request-method") !== "POST") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use POST.");
      headers.set("Access-Control-Allow-Methods", "POST");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return new Response(null, { status: 204, headers });
    }
    checkConfiguration(env, request);
    await rateLimit(request, env);
    const input = validate(await readJson(request));
    if (input.website) throw new ApiError(403, "BOT_CHECK_FAILED", "Verification failed.");
    await verifyTurnstile(input.turnstileToken, env);
    const result = await new InquiryRepository(env.DB).save(input, await payloadHash(input));
    ctx.waitUntil(safelyProcessNotifications(env));
    return respond({ ok: true, ...result }, result.duplicate ? 200 : 201);
  } catch (error) {
    const issue = error instanceof ApiError ? error : new ApiError(503, "UNAVAILABLE", "Submission is temporarily unavailable.");
    if (issue.status === 429) headers.set("Retry-After", "60");
    return respond({ ok: false, code: issue.code, message: issue.message, ...issue.fields ? { fields: issue.fields } : {} }, issue.status);
  }
}
var stdin_default = {
  fetch: handleRequest,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(safelyProcessNotifications(env));
  }
};
export {
  stdin_default as default,
  handleRequest
};
