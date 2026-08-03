#!/usr/bin/env node
// Reads data/products-source.csv, creates a Stripe Product + Price for each row,
// and writes the resulting price IDs back into data/products.json.
//
// Usage:
//   1. Add rows to data/products-source.csv (id, category, title, price, imageFile)
//   2. Put real images in images/, named to match imageFile
//   3. Set STRIPE_SECRET_KEY in a local .env file (never commit it, never share it)
//   4. Run: npm run add-products

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const CSV_PATH = path.join(__dirname, '..', 'data', 'products-source.csv');
const JSON_PATH = path.join(__dirname, '..', 'data', 'products.json');

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split('\n');
  const headers = headerLine.split(',').map((h) => h.trim());
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
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

  for (const row of rows) {
    const priceCents = Math.round(parseFloat(row.price) * 100);

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
      price: parseFloat(row.price),
      image: `images/${row.imageFile}`,
      stripePriceId: price.id,
      active: true,
    };

    const existingIndex = catalog.products.findIndex((p) => p.id === row.id);
    if (existingIndex >= 0) {
      catalog.products[existingIndex] = entry;
    } else {
      catalog.products.push(entry);
    }

    console.log(`Created "${row.title}" -> ${price.id}`);
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2));
  console.log('data/products.json updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
