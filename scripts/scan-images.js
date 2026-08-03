#!/usr/bin/env node
// Scans images/products/<category-slug>/ folders and adds any new image files
// to data/products-source.csv, using the filename as the print title.
// This step does NOT talk to Stripe -- it just prepares the spreadsheet.
// New rows are added with a blank price for you to fill in by hand.
//
// Usage:
//   1. Put print photos into images/products/<category-slug>/, named exactly
//      what you want the print to be called on the site, e.g.:
//        images/products/botanicals/Fern Study No. 1.jpg
//   2. Run: npm run scan-images
//   3. Open data/products-source.csv (in Excel, Numbers, or Google Sheets)
//      and fill in the "price" column for any new rows -- they'll be blank.
//   4. Run: npm run add-products

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'products.json');
const CSV_PATH = path.join(__dirname, '..', 'data', 'products-source.csv');
const PRODUCTS_IMAGE_ROOT = path.join(__dirname, '..', 'images', 'products');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const CSV_HEADERS = ['id', 'category', 'title', 'price', 'imageFile'];

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
        row[h] = values[i] ?? '';
      });
      return row;
    });
}

function csvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(rows) {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((h) => csvField(row[h])).join(','));
  }
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function titleFromFilename(filename) {
  return filename.replace(path.extname(filename), '').trim();
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const categorySlugs = catalog.categories.map((c) => c.slug);

  const rows = fs.existsSync(CSV_PATH) ? parseCsv(fs.readFileSync(CSV_PATH, 'utf8')) : [];
  const knownImages = new Set(rows.map((r) => r.imageFile));
  const usedIds = new Set(rows.map((r) => r.id));

  let added = 0;
  const skippedFolders = [];

  for (const slug of categorySlugs) {
    const dir = path.join(PRODUCTS_IMAGE_ROOT, slug);
    if (!fs.existsSync(dir)) {
      skippedFolders.push(slug);
      continue;
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort();

    for (const file of files) {
      const imageFile = `products/${slug}/${file}`;
      if (knownImages.has(imageFile)) continue;

      const title = titleFromFilename(file);
      let id = `${slug}-${slugify(title)}`;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${slug}-${slugify(title)}-${suffix}`;
        suffix++;
      }
      usedIds.add(id);

      rows.push({ id, category: slug, title, price: '', imageFile });
      knownImages.add(imageFile);
      added += 1;
      console.log(`Found new print: "${title}" (${slug})`);
    }
  }

  writeCsv(rows);

  if (skippedFolders.length > 0) {
    console.log(`\nNo folder found for: ${skippedFolders.join(', ')} (expected images/products/<slug>/)`);
  }

  if (added === 0) {
    console.log('No new images found in images/products/<category>/.');
  } else {
    console.log(`\nAdded ${added} new row(s) to data/products-source.csv.`);
    console.log('Open that file and fill in the "price" column for the new rows, then run: npm run add-products');
  }
}

main();
