// Launch promo: buy one print, get a second print (the cheaper of the two)
// free, for a 48-hour window. Keep these three values in sync with
// netlify/functions/create-bogo-checkout-session.js.
const PROMO_CODE = 'FLOWERSAREBORING';
const PROMO_STARTS = new Date('2026-09-02T12:00:00Z'); // 8am ET (EDT, UTC-4)
const PROMO_ENDS = new Date('2026-09-04T12:00:00Z'); // 48 hours later

function promoStatus() {
  const now = new Date();
  if (now < PROMO_STARTS) return 'upcoming';
  if (now > PROMO_ENDS) return 'ended';
  return 'active';
}

function isBogoUnlocked() {
  return promoStatus() === 'active' && localStorage.getItem('bogoUnlocked') === '1';
}

function unlockBogo() {
  localStorage.setItem('bogoUnlocked', '1');
}

function getBogoCart() {
  try {
    return JSON.parse(localStorage.getItem('bogoCart') || '[]');
  } catch (err) {
    return [];
  }
}

function setBogoCart(items) {
  localStorage.setItem('bogoCart', JSON.stringify(items));
}

function addToBogoCart(item) {
  const cart = getBogoCart();
  if (cart.length >= 2) return { ok: false, reason: 'full' };
  cart.push(item);
  setBogoCart(cart);
  return { ok: true };
}

function removeFromBogoCart(index) {
  const cart = getBogoCart();
  cart.splice(index, 1);
  setBogoCart(cart);
}

function clearBogoCart() {
  localStorage.removeItem('bogoCart');
}

// Small floating widget shown site-wide once at least one print has been
// added to the gift set. Safe to call repeatedly -- re-renders in place.
function renderBogoWidget() {
  const existing = document.querySelector('[data-bogo-widget]');
  if (existing) existing.remove();

  // Redundant on the gift-set page itself, which already shows the cart.
  if (location.pathname.endsWith('promo.html')) return;
  if (!isBogoUnlocked()) return;
  const cart = getBogoCart();
  if (cart.length === 0) return;

  const widget = document.createElement('a');
  widget.href = 'promo.html';
  widget.className = 'bogo-widget';
  widget.setAttribute('data-bogo-widget', '');
  widget.innerHTML = `&#127873; Gift set: ${cart.length}/2 &rsaquo;`;
  document.body.appendChild(widget);
}

document.addEventListener('DOMContentLoaded', renderBogoWidget);
