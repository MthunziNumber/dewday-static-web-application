# Dewday static website and Worker

A Cloudflare Pages/Workers application featuring a responsive landing page and a secure contact form backed by a Worker.

## Features

- Responsive static website with accessible navigation and forms
- Cloudflare Assets integration for the frontend
- Worker endpoint at `/api/contact` for validated form submissions
- Server-side email delivery through an environment-configured API
- Health check endpoint at `/health`
- Automated tests for the contact Worker

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Replace the values in `.dev.vars` with your real email provider settings. Set `EMAIL_FROM` to a sender address verified with that provider.

4. Start the Cloudflare Worker locally:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Wrangler.

## Cloudflare deployment

1. Create a Cloudflare Worker from this repository.
2. Configure the following secrets in Cloudflare Workers:

   - `EMAIL_API_URL`
   - `EMAIL_API_TOKEN`
   - `EMAIL_FROM` (must be a verified sender address)

   You can set them with `npx wrangler secret put EMAIL_API_URL`, `npx wrangler secret put EMAIL_API_TOKEN`, and `npx wrangler secret put EMAIL_FROM`.

3. Deploy with:

   ```bash
   npm run deploy
   ```

The Worker sends a `POST` request to `EMAIL_API_URL` with a `Bearer` authorization token, `content-type: application/json`, and this JSON body:

```json
{
  "subject": "New quotation request from Ada Lovelace",
  "to": "dewdaytrading@gmail.com",
  "from": "verified-sender@your-domain.example",
  "reply_to": "ada@example.com",
  "text": "Please provide a quotation.\n\nFrom: Ada Lovelace\nEmail: ada@example.com\nContact number: +27 73 761 8175"
}
```

Use a provider endpoint that accepts this request format, or adapt `sendEmail` in `src/worker.ts` to the provider's API. The visitor's email is used only as `reply_to`; `EMAIL_FROM` is the verified sender. Keep the API token server-side and never expose it to the browser.

## Contact endpoint

Send a JSON request to `/api/contact`:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "number": "+27 73 761 8175",
  "message": "Hello from the Dewday website."
}
```

The Worker rejects missing, malformed, or oversized fields (including the contact number) and returns JSON errors for invalid submissions.

## Scripts

- `npm test` — run the Worker tests
- `npm run dev` — start Wrangler locally
- `npm run build` — create a Cloudflare deployment dry run
- `npm run deploy` — deploy the Worker and static assets
