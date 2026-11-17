# Vision Hardware — Website Preview

## Local development

The phase-two audit starts from main commit `0d2cb5d8e09402f4e0a4a957b510c117a5febf72`.
Use a separate development branch; pushing main can trigger the production Cloudflare build.

With Node.js 24 available, run `node scripts/preview.mjs` and open
`http://127.0.0.1:8787`. The local RFQ uses fictional data, SQLite storage and
simulated notifications; it needs no npm packages. See `docs/rfq-local-v1.md`.
It does not emulate live Turnstile, real email delivery, or production performance. Use Wrangler local testing
and a separately configured staging Worker before releasing those integrations.
Do not run the production deploy script for previews.

See `docs/phase2-plan.md` for the source audit and implementation gates.

B2B garment accessories and hardware website, hosted on Cloudflare Workers.

This is a design preview. Product illustrations are conceptual, company information requires approval, and online inquiry submission is not active.

## Deployment

The Cloudflare Worker is named `visionhardware-web` and uses `src/index.js` as its entry point. Connect this GitHub repository to the existing Worker in Cloudflare Builds; deploy command: `npx wrangler deploy`.

The preview intentionally uses `noindex,nofollow` until the client has approved the content and the site is ready to go live.

## Continuous deployment

Cloudflare Workers Builds is connected to this repository, tracking the `main` branch. The deployment command is `npx wrangler deploy` and the worker name is `visionhardware-web`.

The site is still a client-review preview. Before public launch, replace illustrative products, confirm company details, activate and test inquiries, and remove the `noindex` directive only after approval.

## Production release — 2026-11-17

The supplied company/product content is now deployed to visionhardware.net: 22 product families, 56 reference pages, WebP images and company contact details. Production quotations currently use the company email link; the online form and automatic notifications remain isolated in staging until verified production sending and privacy processing are configured. Search indexing remains disabled pending SEO release review.

Production Worker version: 617e64ec-8b08-4f6d-8979-f5ccf2ad6ea2. Validation: 25 Node tests passed. Static assets are configured in wrangler.toml for subsequent GitHub deployments.
