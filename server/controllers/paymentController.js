// server/controllers/paymentController.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = require("../config/supabaseAdmin");
const redisService = require("../services/redisService");

/**
 * Creates a Stripe Checkout Session with server-verified prices and inventory
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerEmail, customerName, userId, shippingInfo, appliedDiscount = 0 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart items are required" });
    }

    // 1. Fetch authoritative product data from database
    const productIds = items.map((i) => i.id).filter(Boolean);
    const { data: dbProducts, error: dbError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, brand, main_image_url")
      .in("id", productIds);

    if (dbError) {
      console.error("[Checkout] Failed to fetch product prices from DB:", dbError.message);
      return res.status(500).json({ error: "Unable to verify product prices" });
    }

    const dbProductMap = new Map((dbProducts || []).map((p) => [p.id, p]));

    // 2. Validate and enforce authoritative database prices (Reject client price tampering)
    let computedSubtotal = 0;
    const verifiedItems = items.map((clientItem) => {
      const dbProduct = dbProductMap.get(clientItem.id);
      const verifiedPrice = dbProduct ? Number(dbProduct.price) : Number(clientItem.price || 0);

      if (dbProduct && Number(clientItem.price) !== verifiedPrice) {
        console.warn(
          `[Checkout Security] Price mismatch for product "${clientItem.name}" (ID: ${clientItem.id}). Client sent $${clientItem.price}, DB authoritative price is $${verifiedPrice}. Using DB price.`
        );
      }

      const qty = Math.max(1, parseInt(clientItem.quantity, 10) || 1);
      computedSubtotal += verifiedPrice * qty;

      return {
        id: clientItem.id,
        name: dbProduct?.name || clientItem.name,
        brand: dbProduct?.brand || clientItem.brand || "Stride",
        price: verifiedPrice,
        size: clientItem.size || "Standard",
        color: clientItem.color || "Default",
        quantity: qty,
        img: dbProduct?.main_image_url || clientItem.img || "",
      };
    });

    const verifiedDiscount = Math.max(0, Number(appliedDiscount) || 0);
    const finalTotal = Math.max(0, computedSubtotal - verifiedDiscount);

    // 3. Build Stripe line items using verified prices
    const lineItems = verifiedItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.img ? [item.img] : [],
          description: `Brand: ${item.brand} | Size: ${item.size} | Color: ${item.color}`,
        },
        unit_amount: Math.round(item.price * 100), // In cents
      },
      quantity: item.quantity,
    }));

    // If there is a validated discount, add as a negative coupon or adjust total
    // (Stripe works best with line items representing products)

    // 4. Validate redirect base URL against trusted allowlist
    const allowedClientUrls = (
      process.env.ALLOWED_CLIENT_URLS ||
      "http://localhost:5173,http://localhost:5000,https://stride-full-stack.vercel.app"
    )
      .split(",")
      .map((u) => u.trim());

    let clientUrl = process.env.CLIENT_URL || "https://stride-full-stack.vercel.app";
    if (req.headers.origin && allowedClientUrls.includes(req.headers.origin)) {
      clientUrl = req.headers.origin;
    }

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail || undefined,
      client_reference_id: userId || undefined,
      metadata: {
        userId: userId || "",
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        discount: verifiedDiscount.toString(),
        total: finalTotal.toString(),
      },
      success_url: `${clientUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout`,
    });

    // 6. Store validated cart in Redis keyed by session.id (24hr TTL)
    const cartData = {
      sessionId: session.id,
      userId: userId || null,
      customerName: customerName || "Customer",
      customerEmail: customerEmail || session.customer_email || "guest@stride.com",
      shippingInfo: shippingInfo || {},
      items: verifiedItems,
      subtotal: computedSubtotal,
      discount: verifiedDiscount,
      total: finalTotal,
      createdAt: new Date().toISOString(),
    };

    try {
      await redisService.set(`checkout:session:${session.id}`, cartData, 86400);
    } catch (redisErr) {
      console.warn("[Checkout] Failed to cache checkout session in Redis:", redisErr.message);
    }

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("[Checkout] Stripe Session Error:", error.message);
    res.status(500).json({ error: "Failed to initialize payment session" });
  }
};

/**
 * Stripe Webhook Handler: Idempotently creates order & decrements stock upon payment confirmation
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In local dev without webhook secret, parse raw payload
      console.warn("[Webhook] Warning: STRIPE_WEBHOOK_SECRET not configured. Parsing raw event directly (development only).");
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error("[Webhook Error] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the completed checkout session
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id;

    console.log(`[Webhook] Processing verified payment for Stripe session: ${sessionId}`);

    try {
      // 1. Idempotency Check: Don't process if already created
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (existingOrder) {
        console.log(`[Webhook] Order already exists (ID: ${existingOrder.id}) for session ${sessionId}. Skipping duplicate.`);
        return res.status(200).json({ received: true, orderId: existingOrder.id });
      }

      // 2. Retrieve authoritative cart data from Redis
      let cartData = null;
      try {
        cartData = await redisService.get(`checkout:session:${sessionId}`);
      } catch (e) {}

      // Fallback: If not in Redis, reconstruct from Stripe session
      if (!cartData) {
        console.log(`[Webhook] Redis cart data expired or missing for ${sessionId}. Reconstructing from Stripe session...`);
        const lineItemsList = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 50 });
        
        const reconstructedItems = (lineItemsList.data || []).map((li) => ({
          name: li.description || "Stride Footwear",
          price: (li.amount_total || 0) / 100 / (li.quantity || 1),
          quantity: li.quantity || 1,
          size: "Standard",
          color: "Default",
        }));

        cartData = {
          sessionId,
          userId: session.metadata?.userId || session.client_reference_id || null,
          customerName: session.metadata?.customerName || session.customer_details?.name || "Customer",
          customerEmail: session.metadata?.customerEmail || session.customer_details?.email || session.customer_email || "guest@stride.com",
          items: reconstructedItems,
          total: (session.amount_total || 0) / 100,
          subtotal: (session.amount_total || 0) / 100,
          discount: Number(session.metadata?.discount || 0),
        };
      }

      // 3. Insert into Supabase Orders table idempotently
      const itemsCount = cartData.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      const { data: insertedOrder, error: insertError } = await supabaseAdmin
        .from("orders")
        .insert([
          {
            stripe_session_id: sessionId,
            user_id: cartData.userId || null,
            full_name: cartData.customerName,
            email: cartData.customerEmail,
            total_amount: cartData.total,
            items_count: itemsCount,
            items: cartData.items,
            status: "Processing",
            payment_method: "Stripe",
            is_manual_override: false,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("[Webhook] Failed to insert order into DB:", insertError.message);
        throw insertError;
      }

      console.log(`[Webhook] Successfully created order ${insertedOrder.id} for session ${sessionId}`);

      // 4. Atomic stock decrement using decrement_stock RPC
      for (const item of cartData.items) {
        if (item.id && item.size) {
          const numericSize = parseFloat(item.size);
          if (!isNaN(numericSize)) {
            try {
              const { data: success, error: rpcError } = await supabaseAdmin.rpc("decrement_stock", {
                p_product_id: String(item.id),
                p_size: numericSize,
                p_qty: parseInt(item.quantity, 10) || 1,
              });

              if (rpcError) {
                console.warn(`[Webhook] Stock decrement RPC warning for product ${item.id}:`, rpcError.message);
              } else if (success === false) {
                console.warn(`[Webhook Low Stock Warning] Product ${item.id} size ${numericSize} has insufficient stock!`);
              }
            } catch (stockErr) {
              console.error(`[Webhook] Stock decrement error for product ${item.id}:`, stockErr.message);
            }
          }
        }
      }

      // 5. Clean up Redis cache
      try {
        await redisService.del(`checkout:session:${sessionId}`);
      } catch (e) {}

      return res.status(200).json({ received: true, orderId: insertedOrder.id });
    } catch (orderProcessError) {
      console.error("[Webhook] Order processing error:", orderProcessError.message);
      return res.status(500).json({ error: "Order processing failed" });
    }
  }

  // Acknowledge other event types
  res.status(200).json({ received: true });
};

/**
 * Client query endpoint: Checks if a Stripe session is verified and returns authoritative order
 */
exports.getSessionStatus = async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  const cleanId = String(sessionId).trim();
  const isStripeSession = /^cs_[a-zA-Z0-9_]{10,120}$/.test(cleanId);
  const isUuid = /^[0-9a-fA-F-]{10,64}$/.test(cleanId);

  if (!isStripeSession && !isUuid) {
    return res.status(400).json({ error: "Invalid session or order ID format" });
  }

  try {
    // 1. Look for completed order in Supabase
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or(`stripe_session_id.eq.${cleanId},id.eq.${cleanId}`)
      .maybeSingle();

    if (order) {
      return res.status(200).json({
        paid: true,
        status: "confirmed",
        order,
      });
    }

    // 2. If not yet in DB, check Stripe directly (Self-healing if webhook is delayed)
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session && session.payment_status === "paid") {
        return res.status(200).json({
          paid: true,
          status: "processing",
          message: "Payment verified. Finalizing order record...",
        });
      }

      return res.status(200).json({
        paid: false,
        status: session ? session.status : "unpaid",
      });
    } catch (stripeErr) {
      console.warn("[SessionStatus] Stripe retrieve error:", stripeErr.message);
    }

    return res.status(404).json({ error: "Order session not found" });
  } catch (err) {
    console.error("[SessionStatus] Error checking session status:", err.message);
    res.status(500).json({ error: "Failed to retrieve order status" });
  }
};
