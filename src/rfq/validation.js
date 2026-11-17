import {supplied} from '../content/supplied.js';
// Adapted from the user-owned NEXKITRA inquiry implementation.
import { ApiError } from "./types.js";
const CONSENT_VERSION = "vision-rfq-v1-draft";
const MAX_BODY_BYTES = 32 * 1024;
const products = [...supplied.categories.map(c=>c.slug),'metal-hardware','buttons-fasteners','zippers-pullers','buckles-adjusters','labels-patches','webbings-tapes','cords-drawstrings','custom-accessories'];
const limits = { name: 100, organisation: 160, country: 80, email: 254, message: 5e3, sourcePage: 200, idempotencyKey: 36, turnstileToken: 2048, website: 200 };
const allowed = /* @__PURE__ */ new Set([...Object.keys(limits), "productInterest", "estimatedQuantity", "privacyConsent"]);
async function readJson(request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ApiError(415, "CONTENT_TYPE", "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "VALIDATION", "A JSON body is required.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new ApiError(413, "TOO_LARGE", "Request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "VALIDATION", "Invalid JSON.");
  }
}
function validate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "VALIDATION", "Expected a JSON object.");
  const input = value;
  const fields = {};
  const normalized = {};
  if (Object.keys(input).some((key) => !allowed.has(key))) fields.form = "Unexpected field.";
  for (const [key, max] of Object.entries(limits)) {
    const item = input[key];
    if (typeof item !== "string") {
      fields[key] = "Expected text.";
      continue;
    }
    const text = item.trim();
    if (!text && key !== "website" || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || key !== "message" && /[\r\n]/.test(text)) fields[key] = `Enter valid text (maximum ${max} characters).`;
    normalized[key] = text;
  }
  if (typeof normalized.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) fields.email = "Enter a valid email address.";
  if (typeof normalized.idempotencyKey === "string" && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized.idempotencyKey)) fields.idempotencyKey = "Expected a UUID v4.";
  if (typeof normalized.sourcePage === "string" && !/^\/[a-zA-Z0-9/_-]*$/.test(normalized.sourcePage)) fields.sourcePage = "Use a page path without query or fragment.";
  if (!products.includes(input.productInterest)) fields.productInterest = "Select a product.";
  if (typeof input.estimatedQuantity !== "number" || !Number.isInteger(input.estimatedQuantity) || input.estimatedQuantity < 1 || input.estimatedQuantity > 1e6) fields.estimatedQuantity = "Enter a whole quantity from 1 to 1000000.";
  if (input.privacyConsent !== true) fields.privacyConsent = "Consent is required.";
  if (Object.keys(fields).length) throw new ApiError(400, "VALIDATION", "Please check the fields listed below.", fields);
  return { ...normalized, productInterest: input.productInterest, estimatedQuantity: input.estimatedQuantity, privacyConsent: true };
}
async function payloadHash(input) {
  const canonical = JSON.stringify([input.name, input.organisation, input.country, input.email, input.productInterest, input.estimatedQuantity, input.message, input.sourcePage, CONSENT_VERSION]);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export {
  CONSENT_VERSION,
  MAX_BODY_BYTES,
  payloadHash,
  readJson,
  validate
};
