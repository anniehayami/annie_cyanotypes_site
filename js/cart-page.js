function renderCart() {
  const cart = getCart();
  const container = document.querySelector('[data-cart-items]');
  const totalEl = document.querySelector('[data-cart-total]');
  const checkoutBtn = document.querySelector('[data-cart-checkout]');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
    totalEl.hidden = true;
    checkoutBtn.hidden = true;
    return;
  }

  container.innerHTML = cart
    .map(
      (item, i) => `
    <div class="cart-item">
      <div>
        <strong>${item.title}</strong> &mdash; ${item.sizeName}
        <div class="cart-item-qty">
          $${item.price.toFixed(2)} &times;
          <button type="button" class="qty-btn" data-qty-decrease="${i}" aria-label="Decrease quantity">&minus;</button>
          <span>${item.quantity}</span>
          <button type="button" class="qty-btn" data-qty-increase="${i}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="promo-remove" data-cart-remove="${i}">Remove</button>
    </div>
  `
    )
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

  totalEl.hidden = false;
  totalEl.textContent = `Total: $${cartTotal().toFixed(2)}`;
  checkoutBtn.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  document.querySelector('[data-cart-checkout]').addEventListener('click', async () => {
    const cart = getCart();
    if (cart.length === 0) return;
    await openCartCheckout(cart.map((i) => ({ priceId: i.priceId, quantity: i.quantity })));
  });

  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
