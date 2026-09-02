const Stripe = require('stripe');

// Launch promo: with a valid code and at least 2 prints in the cart, the
// single cheapest print becomes free, for a 48-hour window. Keep these
// three values in sync with js/cart-page.js.
const PROMO_CODE = 'FLOWERSAREBORING';
const PROMO_STARTS = new Date('2026-09-02T12:00:00Z'); // 8am ET (EDT, UTC-4)
const PROMO_ENDS = new Date('2026-09-04T12:00:00Z'); // 48 hours later

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured.' }) };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { items, promoCode } = JSON.parse(event.body || '{}');

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Your cart is empty.' }) };
    }

    const cartLines = items.map((item) => ({
      priceId: item.priceId,
      quantity: Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1)),
    }));

    if (cartLines.some((li) => !li.priceId)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'One of the items in your cart is invalid.' }) };
    }

    const totalQty = cartLines.reduce((n, li) => n + li.quantity, 0);

    let applyPromo = false;
    if (typeof promoCode === 'string' && promoCode.trim().toUpperCase() === PROMO_CODE) {
      const now = new Date();
      if (now >= PROMO_STARTS && now <= PROMO_ENDS && totalQty >= 2) {
        applyPromo = true;
      }
    }

    // Look up each price once (needed for its own amount, and, if the promo
    // applies, to build a $0 line on the same underlying product).
    const prices = await Promise.all(cartLines.map((li) => stripe.prices.retrieve(li.priceId)));

    let line_items = cartLines.map((li, i) => ({
      price: li.priceId,
      quantity: li.quantity,
      unit_amount: prices[i].unit_amount,
      product: prices[i].product,
      currency: prices[i].currency,
    }));

    if (applyPromo) {
      let cheapestIndex = 0;
      line_items.forEach((li, i) => {
        if (li.unit_amount < line_items[cheapestIndex].unit_amount) cheapestIndex = i;
      });

      const target = line_items[cheapestIndex];
      if (target.quantity > 1) {
        // Peel one free unit off the line rather than zeroing the whole line.
        target.quantity -= 1;
        line_items.push({
          quantity: 1,
          product: target.product,
          currency: target.currency,
          free: true,
        });
      } else {
        target.free = true;
      }
    }

    line_items = line_items.map((li) =>
      li.free
        ? { quantity: li.quantity, price_data: { currency: li.currency, product: li.product, unit_amount: 0 } }
        : { price: li.price, quantity: li.quantity }
    );

    const siteUrl = process.env.URL || `https://${event.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB'] },
      return_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: session.client_secret }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
