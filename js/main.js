async function loadCatalog() {
  const res = await fetch('/data/products.json');
  return res.json();
}

function renderHero(catalog) {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  hero.style.backgroundImage = `url('${catalog.hero.image}')`;
  hero.querySelector('[data-hero-title]').textContent = catalog.hero.title;
}

function renderCategoryGallery(catalog) {
  const gallery = document.querySelector('[data-category-gallery]');
  if (!gallery) return;
  gallery.innerHTML = catalog.categories
    .map(
      (cat) => `
      <a class="category-tile" href="category.html?cat=${cat.slug}">
        <span class="category-tile-image" style="background-image:url('${cat.image}')"></span>
        <span class="category-tile-label">${cat.name}</span>
      </a>
    `
    )
    .join('');
}

function renderCategoryFilters(catalog) {
  const nav = document.querySelector('[data-shop-filters]');
  if (!nav) return;

  const params = new URLSearchParams(window.location.search);
  const activeSlug = params.get('cat') || '';
  const items = [{ slug: '', name: 'All' }, ...catalog.categories];

  nav.innerHTML = items
    .map((c) => {
      const href = c.slug ? `category.html?cat=${c.slug}` : 'category.html';
      const activeClass = c.slug === activeSlug ? ' active' : '';
      return `<a href="${href}" class="shop-filter${activeClass}">${c.name}</a>`;
    })
    .join('');
}

function renderProductGrid(catalog) {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('cat');

  const products = catalog.products.filter((p) => !slug || p.category === slug);

  if (products.length === 0) {
    grid.innerHTML = '';
    const empty = document.querySelector('[data-empty-state]');
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
        <a class="product-card" href="product.html?id=${p.id}">
          <div class="product-card-image" style="background-image:url('${p.image}')"></div>
          <h3>${p.title}</h3>
          <p class="price">$${p.price.toFixed(2)}</p>
        </a>
      `
    )
    .join('');
}

function renderProductDetail(catalog) {
  const root = document.querySelector('[data-product-detail]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const product = catalog.products.find((p) => p.id === id);

  if (!product) {
    root.innerHTML = '<p class="empty-state">Print not found.</p>';
    return;
  }

  const category = catalog.categories.find((c) => c.slug === product.category);
  const inCategory = catalog.products.filter((p) => p.category === product.category);
  const index = inCategory.findIndex((p) => p.id === product.id);
  const next = inCategory[(index + 1) % inCategory.length];

  const breadcrumb = document.querySelector('[data-breadcrumb]');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="category.html?cat=${product.category}">${category ? category.name : 'Prints'}</a>
      <span>&rsaquo;</span>
      <span>${product.title}</span>
    `;
  }

  const nextLink = document.querySelector('[data-next-link]');
  if (nextLink && next && next.id !== product.id) {
    nextLink.href = `product.html?id=${next.id}`;
    nextLink.hidden = false;
  }

  document.title = `${product.title} — Annie's Cyanotypes`;

  const canBuy = Boolean(product.active && product.stripePriceId);

  root.innerHTML = `
    <div class="product-detail-media">
      <div class="product-detail-image" style="background-image:url('${product.image}')"></div>
    </div>
    <div class="product-detail-info">
      <h1>${product.title}</h1>
      ${product.description.map((line) => `<p>${line}</p>`).join('')}
      <p class="product-detail-price">$${product.price.toFixed(2)}</p>
      <button class="btn" data-price-id="${product.stripePriceId || ''}">Add to Cart</button>
    </div>
  `;

  const buyBtn = root.querySelector('button[data-price-id]');
  if (buyBtn && canBuy) {
    buyBtn.addEventListener('click', () => openCheckout(buyBtn.dataset.priceId));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const catalog = await loadCatalog();
  renderHero(catalog);
  renderCategoryGallery(catalog);
  renderCategoryFilters(catalog);
  renderProductGrid(catalog);
  renderProductDetail(catalog);

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
