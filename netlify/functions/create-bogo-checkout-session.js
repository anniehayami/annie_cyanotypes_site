const Stripe = require('stripe');

// Launch promo: buy one print, get a second print (the cheaper of the two)
// free, for a 48-hour window. Keep these three values in sync with js/promo.js.
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
    const { priceIds, code } = JSON.parse(event.body || '{}');

    if (!Array.isArray(priceIds) || priceIds.length !== 2 || priceIds.some((id) => !id)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Two priceIds are required.' }) };
    }

    if (typeof code !== 'string' || code.trim().toUpperCase() !== PROMO_CODE) {
      return { statusCode: 400, body: JSON.stringify({ error: 'That gift code is not valid.' }) };
    }

    const now = new Date();
    if (now < PROMO_STARTS) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This offer has not started yet.' }) };
    }
    if (now > PROMO_ENDS) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This offer has ended.' }) };
    }

    const [priceA, priceB] = await Promise.all([
      stripe.prices.retrieve(priceIds[0]),
      stripe.prices.retrieve(priceIds[1]),
    ]);
    const prices = [priceA, priceB];

    // Make the cheaper of the two items free; if they're tied, free the second one.
    const freeIndex = priceA.unit_amount <= priceB.unit_amount ? 0 : 1;

    const line_items = prices.map((price, i) =>
      i === freeIndex
        ? {
            quantity: 1,
            price_data: {
              currency: price.currency,
              product: price.product,
              unit_amount: 0,
            },
          }
        : { price: price.id, quantity: 1 }
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
