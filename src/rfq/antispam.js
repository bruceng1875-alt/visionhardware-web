// Adapted from the user-owned NEXKITRA inquiry implementation.
import { ApiError } from "./types.js";
const isLoopback = (hostname) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
function checkConfiguration(env, request) {
  if (env.ENVIRONMENT === 'staging' ? env.STAGING_TESTS_ENABLED !== 'true' : env.ENVIRONMENT !== 'local' && env.PRIVACY_APPROVED !== 'true') throw new ApiError(503, "UNAVAILABLE", "Privacy configuration pending.");
  if (env.INQUIRIES_ENABLED !== "true" || !env.DB || typeof env.DB.prepare !== "function") throw new ApiError(503, "UNAVAILABLE", "Submission is unavailable.");
  if (env.ENVIRONMENT === "local") {
    if (!isLoopback(new URL(request.url).hostname) || env.TURNSTILE_MODE !== "mock" || !["mock", "mock-fail"].includes(env.MAIL_PROVIDER ?? "") || env.ALLOW_EMAIL_SEND === "true") throw new ApiError(503, "UNAVAILABLE", "Local configuration is invalid.");
  } else if (!["staging", "production"].includes(env.ENVIRONMENT ?? "") || env.TURNSTILE_MODE !== "live" || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_HOSTNAME || !env.RATE_LIMITER || !env.RATE_LIMIT_HMAC_KEY || env.MAIL_PROVIDER !== "resend" || env.ALLOW_EMAIL_SEND !== "true" || !env.RESEND_API_KEY || !env.MAIL_FROM || !env.NOTIFICATION_TO) {
    throw new ApiError(503, "UNAVAILABLE", "Submission is unavailable.");
  }
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  const allow = (env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!origin || origin === "null" || !allow.includes(origin)) throw new ApiError(403, "FORBIDDEN", "Origin is not allowed.");
  if (env.ENVIRONMENT === "local" && !isLoopback(new URL(origin).hostname)) throw new ApiError(403, "FORBIDDEN", "Local origin required.");
  return origin;
}
const localWindows = /* @__PURE__ */ new Map();
async function rateLimit(request, env) {
  if (env.ENVIRONMENT === "local") {
    const now = Date.now();
    const key2 = new URL(request.url).host;
    const window = localWindows.get(key2);
    if (!window || window.until <= now) localWindows.set(key2, { count: 1, until: now + 6e4 });
    else if (++window.count > 60) throw new ApiError(429, "RATE_LIMITED", "Please try again later.");
    return;
  }
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip || !env.RATE_LIMITER || !env.RATE_LIMIT_HMAC_KEY) throw new ApiError(503, "UNAVAILABLE", "Spam protection is unavailable.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.RATE_LIMIT_HMAC_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  const fingerprint = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  if (!(await env.RATE_LIMITER.limit({ key: fingerprint })).success) throw new ApiError(429, "RATE_LIMITED", "Please try again later.");
}
async function verifyTurnstile(token, env, fetcher = fetch) {
  if (env.ENVIRONMENT === "local" && env.TURNSTILE_MODE === "mock") {
    if (token !== "local-test-pass") throw new ApiError(403, "BOT_CHECK_FAILED", "Verification failed.");
    return;
  }
  if (env.TURNSTILE_MODE !== "live" || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_HOSTNAME) throw new ApiError(503, "UNAVAILABLE", "Verification is unavailable.");
  let result;
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) throw new Error("verification unavailable");
    result = await response.json();
  } catch {
    throw new ApiError(503, "VERIFICATION_UNAVAILABLE", "Verification is temporarily unavailable.");
  }
  if (result?.success !== true || result.hostname !== env.TURNSTILE_HOSTNAME || result.action !== "inquiry") throw new ApiError(403, "BOT_CHECK_FAILED", "Verification failed.");
}
export {
  allowedOrigin,
  checkConfiguration,
  isLoopback,
  rateLimit,
  verifyTurnstile
};
