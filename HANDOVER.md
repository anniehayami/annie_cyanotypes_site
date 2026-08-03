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

Product data lives in `data/products.json` (hero image/title, the 4 categories, and the products array — currently **empty**, ready for real inventory). Each product entry needs: `id`, `category` (must match a category `slug`), `title`, `price`, `image`, `description` (array of paragraph strings), `stripePriceId`, `active`. You won't normally hand-write these — the bulk workflow below generates them.

### Bulk-adding Annie's real photos (the main workflow)

This is a two-step process because a photo's filename can carry its title, but not its price — so there's a "gather" step (automatic) and a "set prices" step (manual, but just filling in one spreadsheet column).

**Step 1 — Organize photos into category folders, named exactly as you want them to appear**

Folders already exist for each category:
```
images/products/botanicals/
images/products/animals/
images/products/people/
images/products/places/
```
Drop print photos into the matching folder, and **name each file exactly what the print should be called on the site** — the filename (minus the extension) becomes the title verbatim. For example:
```
images/products/botanicals/Fern Study No. 1.jpg
images/products/places/Fire Escape.jpg
```
Spaces in filenames are fine. This can be done in bulk — hundreds of files at once, no problem.

**Step 2 — Scan for new photos**

Run:
```
npm run scan-images
```
This looks through all four folders, finds any image not already known about, and adds a new row to `data/products-source.csv` for each one — with the title and category filled in automatically, and the **price left blank** for you to fill in. It's safe to run repeatedly as you add more photos over time; it only adds rows for genuinely new files and never touches existing ones.

**Step 3 — Fill in prices**

Open `data/products-source.csv` in Excel, Numbers, or Google Sheets. Fill in the `price` column (plain numbers, no `$`) for any row that's missing one. Save it back as the same CSV filename/format.

**Step 4 — Create the Stripe products**

Run:
```
npm run add-products
```
This needs `STRIPE_SECRET_KEY` set locally first (see Environment/secrets below). For every CSV row that has a price and doesn't already have a Stripe price attached, it creates the Stripe Product + Price via the Stripe API, and writes the resulting `stripePriceId` into `data/products.json` (setting `active: true`, so the "Buy"/"Add to Cart" button lights up). Also safe to re-run — rows already synced to Stripe are skipped, so running it again after adding more photos only processes the new ones. Any row still missing a price is skipped with a warning listing which titles need one.

So the ongoing routine, whenever Annie has a new batch of photos, is just: **drop them in the right folder named correctly → `npm run scan-images` → fill in prices in the CSV → `npm run add-products`.**

### One-off edits

For a single price change, description edit, or renaming a title after the fact, it's simpler to just hand-edit the entry directly in `data/products.json` (or ask Claude Code to do it) — no need to go through the CSV for one-off tweaks. Changing the price in `products.json` alone does **not** update the price in Stripe though; for a real price change, update it in the Stripe Dashboard too (or delete the row's `stripePriceId` and re-run `npm run add-products` to regenerate it).

## Environment / secrets

- `STRIPE_SECRET_KEY` — goes in a local `.env` file (see `.env.example`) for running the bulk-add script, and as an environment variable in the Netlify site settings for the live `create-checkout-session` function. **Never commit this or paste it into a chat with an AI assistant.**
- `STRIPE_PUBLISHABLE_KEY` — goes in `js/config.js`. This one is safe to be public/committed (that's how Stripe's publishable keys work).

## What's still placeholder / not done yet

- **Logo** (`images/logo.png`): text is too small on it, needs a redesign — flagged but not fixed yet.
- **Stripe**: no real account/keys wired up yet. Every product currently has `stripePriceId: null`, so "Add to Cart" buttons render but do nothing until real prices exist.
- **Product photos**: `data/products.json`'s `products` array is intentionally empty right now — a handful of demo entries (reusing placeholder photos) were created earlier just to test grid spacing/layout, then removed once the design was settled. See "Bulk-adding Annie's real photos" above for how to populate it for real. The hero/about/category-tile images are real placeholder photos and are fine to keep or swap independently of the product bulk-upload flow.
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

The code is on GitHub (public repo): https://github.com/willfreeman1/annie_cyanotypes_site

1. On Annie's machine: install [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org) (LTS), and Claude Code.
2. Clone the repo: `git clone https://github.com/willfreeman1/annie_cyanotypes_site.git`
3. Run `npm install` inside the folder (installs the `stripe` and `dotenv` packages used by the bulk-upload scripts).
4. She creates her own Stripe account and sets `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` herself (these are per-account and she should own them, not inherit anyone else's).
5. Connect the GitHub repo to Netlify (Netlify → Add new site → import from GitHub) for automatic deploys on every push — this also solves hosting in the same step.

Going forward, changes should go through git commits/pushes to this repo rather than passing the folder back and forth.
