async function loadCatalog() {
  const res = await fetch('/data/products.json', { cache: 'no-cache' });
  return res.json();
}

// Escapes a path for safe use inside a single-quoted CSS url('...') value
// (filenames/titles can contain apostrophes, e.g. "Brooke's Poppy.jpg").
function cssUrl(path) {
  return path.replace(/'/g, "\\'");
}

function renderHero(catalog) {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  hero.style.backgroundImage = `url('${cssUrl(catalog.hero.image)}')`;
  hero.querySelector('[data-hero-title]').textContent = catalog.hero.title;
}

function renderCategoryGallery(catalog) {
  const gallery = document.querySelector('[data-category-gallery]');
  if (!gallery) return;
  gallery.innerHTML = catalog.categories
    .map(
      (cat) => `
      <a class="category-tile" href="category.html?cat=${cat.slug}">
        <span class="category-tile-image" style="background-image:url('${cssUrl(cat.image)}')"></span>
        <span class="category-tile-label">${cat.name}</span>
      </a>
    `
    )
    .join('');
}

function renderPageTitle(catalog) {
  const container = document.querySelector('[data-page-title]');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('cat');
  const subSlug = params.get('sub');
  const category = catalog.categories.find((c) => c.slug === slug);

  if (category && !subSlug && category.heading) {
    container.innerHTML = `
      <h1>${category.heading}</h1>
      ${category.intro ? `<p class="page-intro">${category.intro}</p>` : ''}
    `;
  } else {
    container.innerHTML = '<h1>Prints</h1>';
  }
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
  const subSlug = params.get('sub');
  const empty = document.querySelector('[data-empty-state]');
  const breadcrumb = document.querySelector('[data-shop-breadcrumb]');
  const category = catalog.categories.find((c) => c.slug === slug);

  // Category has subcategories and none picked yet: show subcategory tiles instead of a flat grid.
  if (category && category.subcategories && !subSlug) {
    if (breadcrumb) {
      breadcrumb.innerHTML = '';
      breadcrumb.style.display = 'none';
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = category.subcategories
      .map(
        (sub) => `
        <a class="category-tile" href="category.html?cat=${slug}&sub=${sub.slug}">
          <span class="category-tile-image" style="background-image:url('${cssUrl(sub.image)}')"></span>
          <span class="category-tile-label">${sub.name}</span>
        </a>
      `
      )
      .join('');
    return;
  }

  if (breadcrumb) {
    const sub = category && category.subcategories && category.subcategories.find((s) => s.slug === subSlug);
    if (category && sub) {
      breadcrumb.style.display = 'block';
      breadcrumb.innerHTML = `
        <a href="category.html?cat=${slug}">${category.name}</a>
        <span>&rsaquo;</span>
        <span>${sub.name}</span>
      `;
    } else {
      breadcrumb.innerHTML = '';
      breadcrumb.style.display = 'none';
    }
  }

  const products = catalog.products.filter(
    (p) => (!slug || p.category === slug) && (!subSlug || p.subcategory === subSlug)
  );

  if (products.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = products
    .map((p) => {
      const fromPrice = Math.min(...p.sizes.map((s) => s.price));
      const imagePosition = p.imagePosition || 'center';
      return `
        <a class="product-card" href="product.html?id=${p.id}">
          <div class="product-card-image" style="background-image:url('${cssUrl(p.image)}'); background-position: ${imagePosition};"></div>
          <h3>${p.title}</h3>
          <p class="price">From $${fromPrice.toFixed(2)}</p>
        </a>
      `;
    })
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

  const imagePosition = product.imagePosition || 'center';

  root.innerHTML = `
    <div class="product-detail-media">
      <div class="product-detail-image" style="background-image:url('${cssUrl(product.image)}'); background-position: ${imagePosition};"></div>
      ${product.framedImage ? '<button class="framed-toggle" data-framed-toggle>See it framed</button>' : ''}
    </div>
    <div class="product-detail-info">
      <h1>${product.title}</h1>
      ${product.description.map((line) => `<p>${line}</p>`).join('')}
      <div class="size-selector" data-size-selector>
        ${product.sizes
          .map(
            (s, i) => `
          <label class="size-option">
            <input type="radio" name="size" value="${i}" ${i === 0 ? 'checked' : ''} />
            <span>
              <span class="size-option-name">${s.name}</span>
              <span class="size-option-dim">${s.dimensions}</span>
              <span class="size-option-price">$${s.price.toFixed(2)}</span>
            </span>
          </label>
        `
          )
          .join('')}
      </div>
      <button class="btn" data-price-id="">Add to Cart</button>
      ${typeof isBogoUnlocked === 'function' && isBogoUnlocked() ? '<button type="button" class="btn btn-outline bogo-add-btn" data-bogo-add>&#127873; Add to Gift Set</button>' : ''}
    </div>
  `;

  const buyBtn = root.querySelector('button[data-price-id]');
  const sizeRadios = Array.from(root.querySelectorAll('input[name="size"]'));

  function updateSelectedSize() {
    const selected = product.sizes[sizeRadios.findIndex((r) => r.checked)];
    const canBuy = Boolean(product.active && selected.stripePriceId);
    buyBtn.dataset.priceId = selected.stripePriceId || '';
    buyBtn.disabled = !canBuy;
    buyBtn.textContent = canBuy ? 'Add to Cart' : 'Coming Soon';
  }

  sizeRadios.forEach((r) => r.addEventListener('change', updateSelectedSize));
  updateSelectedSize();

  buyBtn.addEventListener('click', () => {
    if (!buyBtn.disabled) openCheckout(buyBtn.dataset.priceId);
  });

  const bogoBtn = root.querySelector('[data-bogo-add]');
  if (bogoBtn) {
    bogoBtn.addEventListener('click', () => {
      const selected = product.sizes[sizeRadios.findIndex((r) => r.checked)];
      if (!selected.stripePriceId) return;
      const result = addToBogoCart({
        priceId: selected.stripePriceId,
        title: product.title,
        sizeName: selected.name,
        price: selected.price,
      });
      if (!result.ok) {
        alert('Your gift set already has 2 prints. Visit the gift set page to check out or remove one.');
        return;
      }
      renderBogoWidget();
      bogoBtn.textContent = 'Added to Gift Set ✓';
      bogoBtn.disabled = true;
    });
  }

  const framedToggle = root.querySelector('[data-framed-toggle]');
  if (framedToggle) {
    const mediaImage = root.querySelector('.product-detail-image');
    let showingFramed = false;
    framedToggle.addEventListener('click', () => {
      showingFramed = !showingFramed;
      if (showingFramed) {
        mediaImage.style.backgroundImage = `url('${cssUrl(product.framedImage)}')`;
        framedToggle.textContent = 'See print only';
      } else {
        mediaImage.style.backgroundImage = `url('${cssUrl(product.image)}')`;
        framedToggle.textContent = 'See it framed';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const catalog = await loadCatalog();
  renderHero(catalog);
  renderCategoryGallery(catalog);
  renderPageTitle(catalog);
  renderCategoryFilters(catalog);
  renderProductGrid(catalog);
  renderProductDetail(catalog);

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
