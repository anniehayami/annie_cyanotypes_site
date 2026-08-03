#!/usr/bin/env node
// Reads data/products-source.csv, creates a Stripe Product + Price for each
// row that doesn't already have one, and writes the resulting price IDs back
// into data/products.json. Safe to re-run: rows that already have a Stripe
// price are skipped, so only newly-added rows get created.
//
// Usage:
//   1. Run `npm run scan-images` first to pull in new photos from
//      images/products/<category>/ and add them to the CSV.
//   2. Fill in the "price" column for any new rows in data/products-source.csv.
//   3. Set STRIPE_SECRET_KEY in a local .env file (never commit it, never share it)
//   4. Run: npm run add-products

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const CSV_PATH = path.join(__dirname, '..', 'data', 'products-source.csv');
const JSON_PATH = path.join(__dirname, '..', 'data', 'products.json');

const DEFAULT_DESCRIPTION = [
  'Cyanotype on Arches Platine cotton rag paper.',
  'Replace this with real sizing, edition size, and paper details.',
  'Each print is slightly different due to brushstrokes and other variations in the handmade process.',
];

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return [];
  const headers = splitCsvLine(lines[0]);
  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = splitCsvLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? '').trim();
      });
      return row;
    });
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Set STRIPE_SECRET_KEY (e.g. in a local .env file) before running this script.');
    process.exit(1);
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  const skippedNoPrice = [];
  let created = 0;
  let alreadySynced = 0;

  for (const row of rows) {
    const existing = catalog.products.find((p) => p.id === row.id);

    if (existing && existing.stripePriceId) {
      alreadySynced += 1;
      continue;
    }

    const priceValue = parseFloat(row.price);
    if (!row.price || Number.isNaN(priceValue)) {
      skippedNoPrice.push(row.title || row.id);
      continue;
    }

    const priceCents = Math.round(priceValue * 100);

    const product = await stripe.products.create({ name: row.title });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: 'usd',
    });

    const entry = {
      id: row.id,
      category: row.category,
      title: row.title,
      price: priceValue,
      image: `images/${row.imageFile}`,
      description: existing?.description || DEFAULT_DESCRIPTION,
      stripePriceId: price.id,
      active: true,
    };

    const existingIndex = catalog.products.findIndex((p) => p.id === row.id);
    if (existingIndex >= 0) {
      catalog.products[existingIndex] = entry;
    } else {
      catalog.products.push(entry);
    }

    created += 1;
    console.log(`Created "${row.title}" -> ${price.id}`);
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2));

  console.log(`\n${created} product(s) created, ${alreadySynced} already synced, ${skippedNoPrice.length} skipped (missing price).`);
  if (skippedNoPrice.length > 0) {
    console.log(`Missing prices for: ${skippedNoPrice.join(', ')}`);
    console.log('Fill in the "price" column in data/products-source.csv for these, then run this script again.');
  }
  console.log('data/products.json updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
