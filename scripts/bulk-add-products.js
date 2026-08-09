#!/usr/bin/env node
// Creates a Stripe Product for each print in data/products.json, plus one
// Stripe Price per size (Small/Medium/Large), and writes the resulting price
// IDs back into each size entry. Safe to re-run: any product whose sizes
// already all have a stripePriceId is skipped, so only new/incomplete
// products get created.
//
// Usage:
//   1. Set STRIPE_SECRET_KEY in a local .env file (never commit it, never share it)
//   2. Run: npm run add-products

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const JSON_PATH = path.join(__dirname, '..', 'data', 'products.json');

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Set STRIPE_SECRET_KEY (e.g. in a local .env file) before running this script.');
    process.exit(1);
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  let created = 0;
  let alreadySynced = 0;

  for (const p of catalog.products) {
    const needsSync = p.sizes.some((s) => !s.stripePriceId);
    if (!needsSync) {
      alreadySynced += 1;
      continue;
    }

    const product = await stripe.products.create({ name: p.title });

    for (const size of p.sizes) {
      if (size.stripePriceId) continue;
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(size.price * 100),
        currency: 'usd',
        nickname: size.name,
      });
      size.stripePriceId = price.id;
    }

    p.active = true;
    created += 1;
    console.log(`Created "${p.title}" (${p.sizes.length} sizes) -> ${product.id}`);

    // Save after every product so partial progress survives an interruption.
    fs.writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2) + '\n');
  }

  console.log(`\n${created} product(s) created, ${alreadySynced} already synced.`);
  console.log('data/products.json updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
