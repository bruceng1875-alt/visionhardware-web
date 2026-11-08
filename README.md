# Vision Hardware — Website Preview

B2B garment accessories and hardware website, hosted on Cloudflare Workers.

This is a design preview. Product illustrations are conceptual, company information requires approval, and online inquiry submission is not active.

## Deployment

The Cloudflare Worker is named `visionhardware-web` and uses `src/index.js` as its entry point. Connect this GitHub repository to the existing Worker in Cloudflare Builds; deploy command: `npx wrangler deploy`.

The preview intentionally uses `noindex,nofollow` until the client has approved the content and the site is ready to go live.

## Continuous deployment

Cloudflare Workers Builds is connected to this repository, tracking the `main` branch. The deployment command is `npx wrangler deploy` and the worker name is `visionhardware-web`.

The site is still a client-review preview. Before public launch, replace illustrative products, confirm company details, activate and test inquiries, and remove the `noindex` directive only after approval.
