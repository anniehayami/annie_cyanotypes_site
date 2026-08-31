function renderPromoMessage(text, type) {
  const el = document.querySelector('[data-promo-message]');
  el.textContent = text;
  el.className = 'promo-message' + (type ? ` promo-message-${type}` : '');
}

function showCartSection() {
  document.querySelector('[data-promo-entry]').hidden = true;
  document.querySelector('[data-promo-cart]').hidden = false;
  renderCartItems();
}

function renderCartItems() {
  const cart = getBogoCart();
  const container = document.querySelector('[data-promo-cart-items]');
  const checkoutBtn = document.querySelector('[data-promo-checkout]');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-state">No prints selected yet. Shop and add two prints to your gift set.</p>';
    checkoutBtn.hidden = true;
    return;
  }

  container.innerHTML = cart
    .map(
      (item, i) => `
    <div class="promo-cart-item">
      <div>
        <strong>${item.title}</strong> &mdash; ${item.sizeName}
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
      <button type="button" class="promo-remove" data-remove="${i}">Remove</button>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromBogoCart(Number(btn.dataset.remove));
      renderCartItems();
    });
  });

  checkoutBtn.hidden = cart.length !== 2;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-promo-form]');
  const input = document.querySelector('[data-promo-input]');
  const checkoutBtn = document.querySelector('[data-promo-checkout]');

  if (isBogoUnlocked()) {
    showCartSection();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = promoStatus();
    const entered = input.value.trim().toUpperCase();

    if (status === 'upcoming') {
      renderPromoMessage('This offer isn’t active yet — check back September 2nd.', 'error');
      return;
    }
    if (status === 'ended') {
      renderPromoMessage('This offer has ended.', 'error');
      return;
    }
    if (entered !== PROMO_CODE) {
      renderPromoMessage('That code isn’t valid.', 'error');
      return;
    }

    unlockBogo();
    showCartSection();
  });

  checkoutBtn.addEventListener('click', async () => {
    const cart = getBogoCart();
    if (cart.length !== 2) return;
    await openBogoCheckout(cart.map((i) => i.priceId), PROMO_CODE);
  });

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
