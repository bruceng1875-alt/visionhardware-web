# Supplied content import — 2026-11-17

Source: user-provided 平台整理.xlsx. Existing Vision Hardware layout, brand SVG and Worker architecture retained.

- 22 product families, 8 featured collections, 56 reference pages.
- 110 extracted source images converted to WebP; original specification annotations remain in the images rather than being invented or automatically transcribed.
- Company name, public email fengmeixu07@mail.com, phone +86 135 5941 9353, supplied WhatsApp QR code, MOQ 500 pieces and sample-based customization added.
- Public contact email is independent of staging notification recipient, which remains the previously tested Gmail. Phone is not assumed to be a WhatsApp number.
- Factory/showroom photos linked to About. Product marks in reference images do not imply brand authorization, certification or customer relationships.
- Category migration preserves existing inquiries and outbox records. Tested with foreign-key checks and all 22 category values.
- All categories and reference routes checked; 25 tests pass. Mobile product layout visually checked. Assets use explicit dimensions and lazy loading.

Staging only: production release, verified production email sender, production privacy/retention setup and search indexing remain separate release work. No fabricated prices, certifications, manufacturing specifications or contact accounts added.

## Catalog browsing improvement — 2026-11-17

Moved individual products above collection overview photos. All eight featured collections now present seven clickable model cards, with manually transcribed dimensions and weights from the supplied images (56 records in src/content/specifications.js). Source dimension units were not printed; no units were invented. FY2380 weight annotation is 1.5 without a unit and is labeled accordingly. Front/base weights are preserved separately.

Product details include an accessible native image dialog, adjacent-model navigation, related models and product-specific email inquiry context. Collection cards now preview three models and show a product count. Existing 56 URLs retained. 27 tests pass; actual list-to-detail-to-enlargement flow checked in browser.
