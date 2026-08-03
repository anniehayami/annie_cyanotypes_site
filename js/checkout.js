let stripeInstance;
let embeddedCheckout;

function getStripe() {
  if (!stripeInstance) {
    stripeInstance = Stripe(window.STRIPE_PUBLISHABLE_KEY);
  }
  return stripeInstance;
}

async function openCheckout(priceId) {
  const modal = document.getElementById('checkout-modal');
  const container = document.getElementById('checkout-container');
  container.innerHTML = '<p class="checkout-loading">Loading checkout&hellip;</p>';
  modal.classList.add('open');

  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout could not be started.');

    container.innerHTML = '';
    embeddedCheckout = await getStripe().initEmbeddedCheckout({ clientSecret: data.clientSecret });
    embeddedCheckout.mount('#checkout-container');
  } catch (err) {
    container.innerHTML = `<p class="checkout-loading">${err.message}</p>`;
  }
}

function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  modal.classList.remove('open');
  if (embeddedCheckout) {
    embeddedCheckout.destroy();
    embeddedCheckout = null;
  }
  document.getElementById('checkout-container').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector('[data-checkout-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeCheckout);
});
