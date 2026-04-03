// server/controllers/paymentController.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    // Convert our cart items to Stripe format
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: [item.img],
          description: `Brand: ${item.brand}`,
        },
        unit_amount: Math.round(item.price * 100), // Stripe works in cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,

      // ==========================================
      // REDIRECT URL TOGGLE
      // ==========================================

      // DEPLOYMENT VARIANT: (Active for GitHub/Vercel)
      success_url: `${process.env.CLIENT_URL}/pages/orderConfirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pages/checkOut.html`,

      // LOCAL MACHINE VARIANT: (Uncomment this block when working locally)
      /*
      success_url: `http://127.0.0.1:5501/client/src/pages/orderConfirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://127.0.0.1:5501/client/src/pages/checkOut.html`,
      */
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};
