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

    // Dynamically determine the client base URL for local development & production deployments
    let clientUrl = process.env.CLIENT_URL;
    if (!clientUrl && req.headers.origin) {
      clientUrl = req.headers.origin;
    }
    if (!clientUrl && req.headers.referer) {
      try {
        const urlObj = new URL(req.headers.referer);
        clientUrl = urlObj.origin;
      } catch (e) {}
    }
    if (!clientUrl) {
      clientUrl = "https://stride-full-stack.vercel.app";
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,

      success_url: `${clientUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout`,
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};
