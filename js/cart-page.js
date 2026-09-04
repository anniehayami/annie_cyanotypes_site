// Launch promo: with a valid code and at least 2 prints in the cart, the
// single cheapest print becomes free, from Sept 2 through midnight ET on Sept 7. Keep these
// three values in sync with netlify/functions/create-cart-checkout-session.js.
const PROMO_CODE = 'FLOWERSAREBORING';
const PROMO_STARTS = new Date('2026-09-02T12:00:00Z'); // 8am ET (EDT, UTC-4)
const PROMO_ENDS = new Date('2026-09-08T04:00:00Z'); // midnight ET, end of Sept 7

let appliedPromoCode = null;

function promoStatus() {
  const now = new Date();
  if (now < PROMO_STARTS) return 'upcoming';
  if (now > PROMO_ENDS) return 'ended';
  return 'active';
}

// Index of the cart item with the lowest unit price -- the one the promo
// makes free. Mirrors the server's own selection logic.
function cheapestCartIndex(cart) {
  if (cart.length === 0) return -1;
  let idx = 0;
  cart.forEach((item, i) => {
    if (item.price < cart[idx].price) idx = i;
  });
  return idx;
}

function renderPromoMessage(text, type) {
  const el = document.querySelector('[data-promo-message]');
  el.textContent = text;
  el.className = 'promo-message' + (type ? ` promo-message-${type}` : '');
}

function renderCart() {
  const cart = getCart();
  const container = document.querySelector('[data-cart-items]');
  const totalEl = document.querySelector('[data-cart-total]');
  const checkoutBtn = document.querySelector('[data-cart-checkout]');
  const promoSection = document.querySelector('[data-cart-promo]');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
    totalEl.hidden = true;
    checkoutBtn.hidden = true;
    promoSection.hidden = true;
    return;
  }

  promoSection.hidden = false;

  const totalQty = cart.reduce((n, i) => n + i.quantity, 0);
  const promoEligible = appliedPromoCode && totalQty >= 2;
  const freeIndex = promoEligible ? cheapestCartIndex(cart) : -1;

  container.innerHTML = cart
    .map((item, i) => {
      const isFree = i === freeIndex;
      const priceLine = isFree
        ? item.quantity > 1
          ? `$${item.price.toFixed(2)} &times; ${item.quantity - 1} + 1 <strong>FREE</strong> &#127873;`
          : `<s>$${item.price.toFixed(2)}</s> <strong>FREE</strong> &#127873;`
        : `$${item.price.toFixed(2)} &times;
           <button type="button" class="qty-btn" data-qty-decrease="${i}" aria-label="Decrease quantity">&minus;</button>
           <span>${item.quantity}</span>
           <button type="button" class="qty-btn" data-qty-increase="${i}" aria-label="Increase quantity">+</button>`;

      return `
    <div class="cart-item">
      <div>
        <strong>${item.title}</strong> &mdash; ${item.sizeName}
        <div class="cart-item-qty">${priceLine}</div>
      </div>
      <button type="button" class="promo-remove" data-cart-remove="${i}">Remove</button>
    </div>
  `;
    })
    .join('');

  container.querySelectorAll('[data-cart-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = cart[Number(btn.dataset.cartRemove)];
      removeFromCart(item.priceId);
      renderCart();
    });
  });

  container.querySelectorAll('[data-qty-increase]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = cart[Number(btn.dataset.qtyIncrease)];
      updateCartQuantity(item.priceId, item.quantity + 1);
      renderCart();
    });
  });

  container.querySelectorAll('[data-qty-decrease]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = cart[Number(btn.dataset.qtyDecrease)];
      updateCartQuantity(item.priceId, item.quantity - 1);
      renderCart();
    });
  });

  let total = cartTotal();
  if (freeIndex !== -1) total -= cart[freeIndex].price;

  totalEl.hidden = false;
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  checkoutBtn.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  document.querySelector('[data-promo-apply]').addEventListener('click', () => {
    const input = document.querySelector('[data-promo-input]');
    const entered = input.value.trim().toUpperCase();
    const status = promoStatus();
    const totalQty = getCart().reduce((n, i) => n + i.quantity, 0);

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
    if (totalQty < 2) {
      renderPromoMessage('Add at least 2 prints to use this code.', 'error');
      return;
    }

    appliedPromoCode = PROMO_CODE;
    renderPromoMessage('Code applied — your cheapest print is free! 🎁', 'success');
    renderCart();
  });

  document.querySelector('[data-cart-checkout]').addEventListener('click', async () => {
    const cart = getCart();
    if (cart.length === 0) return;
    await openCartCheckout(
      cart.map((i) => ({ priceId: i.priceId, quantity: i.quantity })),
      appliedPromoCode
    );
  });

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
