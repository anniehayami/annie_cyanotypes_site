# Annie's Cyanotypes — Project Handover

This is a from-scratch static website for selling Annie's cyanotype prints. It was built with Claude Code. This doc exists so whoever picks this project up next — Annie herself, or a fresh Claude Code session on her machine — has the context that isn't obvious just from reading the code.

## What this is, and what it deliberately is NOT

The look (layout, spacing, fonts, colors) was inspired by another cyanotype artist's Squarespace site, at the owner's request. Important constraint that shaped every design decision: **we only borrowed the general layout/style, never any actual content.** No text, photos, product names, or code were copied from that site. If you (or an AI session) go looking for "the reference site" in chat history for more detail, treat it the same way — layout/spacing/color ideas only, never lift its text or images.

Everything here — code, copy placeholders, structure — was written from scratch.

## Tech stack

- Plain HTML/CSS/JS. No framework, no build step. This was a deliberate choice so Claude Code can read and edit the whole site directly as files — no compiled output, no bundler to reason about.
- Hosting target: **Netlify** (static hosting + Netlify Functions + Netlify Forms, all free-tier friendly).
- Payments: **Stripe Embedded Checkout**. The checkout form is Stripe's own hosted UI, but it loads *inline* on the page (not a redirect to a different domain) via a small serverless function.
- Contact form: **Netlify Forms** (no backend code needed — Netlify detects the `data-netlify="true"` form in `contact.html` automatically once deployed).

## Design language (for consistency in future edits)

- Fonts: **Cormorant Garamond** (serif, headings/titles) + **Jost** (sans, nav/body/UI), both loaded free from Google Fonts in `css/style.css`.
- Colors (CSS variables in `css/style.css` `:root`): `--bg` white, `--ink` near-black body text, `--muted` grey for secondary text/prices, `--brown` (`#6b5a48`) for the logo/nav/accent color, `--line` for hairline dividers.
- Header: solid white, sticky, with a large logo image (not text) and small-caps nav links in brown.
- Homepage order: hero (full-bleed image + title + button) → About (photo + text, stacked) → 2×2 category tile grid (portrait 3:4 images, bottom-center labels, tight column gap / wide row gap, no dark hover scrim — just an opacity fade).
- Shop page: "Prints" heading (static) → filter tabs (All + each category, active one underlined) → 3-column product grid, generous row gaps, centered caption (grey serif title, sans price) under each image, no buttons on the grid itself.
- Product detail page: breadcrumb + "Next ›" at top, single square image (no thumbnail row — each print is a one-off, not multiple angles), description paragraphs, price, "Add to Cart" button which opens Stripe's embedded checkout in a modal.
- `checkout-mockup.html` is a **static, non-functional** reference page for agreeing on checkout styling before wiring up the real Stripe Appearance API — it's not linked from anywhere and shouldn't be treated as real functionality.

## How to add or update prints

Product data lives in `data/products.json` (hero image/title, the 4 categories, and the products array). Each product needs: `id`, `category` (must match a category `slug`), `title`, `price`, `image`, `description` (array of paragraph strings), `stripePriceId`, `active`.

For bulk-adding real prints once there are more than a couple:
1. Add a row per print to `data/products-source.csv` (columns: `id,category,title,price,imageFile`).
2. Drop the matching image files in `images/`.
3. Run `npm run add-products` (needs `STRIPE_SECRET_KEY` set locally — see below). This creates the Stripe Product/Price for each row via the Stripe API and writes the resulting `stripePriceId` back into `products.json` automatically, setting `active: true`.

## Environment / secrets

- `STRIPE_SECRET_KEY` — goes in a local `.env` file (see `.env.example`) for running the bulk-add script, and as an environment variable in the Netlify site settings for the live `create-checkout-session` function. **Never commit this or paste it into a chat with an AI assistant.**
- `STRIPE_PUBLISHABLE_KEY` — goes in `js/config.js`. This one is safe to be public/committed (that's how Stripe's publishable keys work).

## What's still placeholder / not done yet

- **Logo** (`images/logo.png`): text is too small on it, needs a redesign — flagged but not fixed yet.
- **Stripe**: no real account/keys wired up yet. Every product currently has `stripePriceId: null`, so "Add to Cart" buttons render but do nothing until real prices exist.
- **Images**: hero, about, and category images are real placeholder photos, but products still reuse a handful of repeated placeholder images — real per-print photos need to go in `images/` and get referenced in `products.json`.
- **Contact form email**: no destination email confirmed yet — needs to be set up in Netlify's dashboard (Site settings → Forms → Notifications) once deployed.
- **Checkout styling**: `checkout-mockup.html` shows the target look; the real Stripe Appearance API config still needs to be written into `netlify/functions/create-checkout-session.js` / `js/checkout.js` to match it.
- **Not deployed yet**: no Netlify site created, no domain connected.

## Local development

No Node.js is installed on this machine yet, which blocks two things: running `npm run add-products`, and using the Netlify CLI to test the serverless function locally. Node is required for both — install from nodejs.org (LTS) first.

For just previewing static pages/layout (no checkout function), any static file server works, e.g.:
```
python -m http.server 8090
```
Then open `http://localhost:8090`. A `.claude/launch.json` config is already set up for this (`preview_start` with name `annie-site` in Claude Code).

## Getting this onto Annie's computer

Recommended path: put it on GitHub (private repo) and have her clone it, rather than copying the folder directly:
1. Commit the current code to git (already an initialized repo locally, nothing committed yet).
2. Create a private GitHub repository and push.
3. On Annie's machine: install Git, Node.js, and Claude Code; clone the repo.
4. She creates her own Stripe account and sets `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` herself (these are per-account and she should own them, not inherit yours).
5. Connect the GitHub repo to Netlify (Netlify → Add new site → import from GitHub) for automatic deploys on every push — this also solves hosting in the same step.

This also means going forward, changes should go through git commits rather than passing the folder back and forth.
