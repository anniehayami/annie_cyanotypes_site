// General shopping cart: lets a customer add any number of prints (any
// mix of products/sizes) before checking out, instead of the old
// one-print-at-a-time instant checkout. Persisted in localStorage so it
// survives navigation between pages.

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch (err) {
    return [];
  }
}

function setCart(items) {
  localStorage.setItem('cart', JSON.stringify(items));
  renderCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((i) => i.priceId === item.priceId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  setCart(cart);
}

function removeFromCart(priceId) {
  setCart(getCart().filter((i) => i.priceId !== priceId));
}

function updateCartQuantity(priceId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.priceId === priceId);
  if (!item) return;
  if (quantity <= 0) {
    setCart(cart.filter((i) => i.priceId !== priceId));
  } else {
    item.quantity = quantity;
    setCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem('cart');
  renderCartBadge();
}

function cartCount() {
  return getCart().reduce((n, i) => n + i.quantity, 0);
}

function cartTotal() {
  return getCart().reduce((n, i) => n + i.quantity * i.price, 0);
}

// Keeps the little count badge on the header "Cart" link in sync. Safe to
// call on any page -- a no-op where the badge isn't in the DOM.
function renderCartBadge() {
  const el = document.querySelector('[data-cart-count]');
  if (!el) return;
  const count = cartCount();
  el.textContent = count;
  el.hidden = count === 0;
}

document.addEventListener('DOMContentLoaded', renderCartBadge);
