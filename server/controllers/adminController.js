// server/controllers/adminController.js
const supabaseAdmin = require("../config/supabaseAdmin");
const embeddingService = require("../services/embeddingService");
const redisService = require("../services/redisService");
const { sendError } = require("../utils/safeError");

// ==========================================
// PRODUCTS MUTATIONS
// ==========================================

exports.createProduct = async (req, res) => {
  try {
    const { product, colors, sizes, notification } = req.body;

    if (!product || !product.name || !product.brand || product.price === undefined) {
      return res.status(400).json({ error: "Missing required product fields" });
    }

    // 1. Prepare and insert product
    const productInsertData = { ...product };

    // Generate semantic embedding on server
    try {
      const text = embeddingService.prepareProductText(productInsertData);
      const embedding = await embeddingService.generateEmbedding(text);
      if (embedding) {
        productInsertData.embedding = embedding;
      }
    } catch (embErr) {
      console.warn("[Admin Create Product] Embedding generation warning:", embErr.message);
    }

    const { data: newProd, error: prodErr } = await supabaseAdmin
      .from("products")
      .insert([productInsertData])
      .select()
      .single();

    if (prodErr || !newProd) {
      throw prodErr || new Error("Failed to insert product");
    }

    const productId = newProd.id;

    // 2. Insert colors
    if (Array.isArray(colors) && colors.length > 0) {
      const colorInserts = colors.map((c) => ({
        product_id: productId,
        color_name: c.color_name,
        color_code: c.color_code || "#000000",
        image_url: c.image_url || "",
      }));
      const { error: colorErr } = await supabaseAdmin.from("product_colors").insert(colorInserts);
      if (colorErr) console.error("[Admin Create Product] Color insert error:", colorErr);
    }

    // 3. Insert sizes
    if (Array.isArray(sizes) && sizes.length > 0) {
      const sizeInserts = sizes.map((s) => ({
        product_id: productId,
        size: s.size,
        stock_quantity: parseInt(s.stock_quantity, 10) || 0,
      }));
      const { error: sizeErr } = await supabaseAdmin.from("product_sizes").insert(sizeInserts);
      if (sizeErr) console.error("[Admin Create Product] Size insert error:", sizeErr);
    }

    // 4. Create notification if provided
    if (notification) {
      await supabaseAdmin.from("platform_notifications").insert([
        {
          title: notification.title || "New Arrival Added",
          message: notification.message || `${product.brand} ${product.name} is now live!`,
          type: "product",
          target_audience: "all",
          related_id: productId,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    // Clear semantic cache
    await redisService.delPattern("search:semantic:*");

    return res.status(201).json({ success: true, product: newProd });
  } catch (error) {
    return sendError(res, 500, "Failed to create product", error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, colors, sizes } = req.body;

    if (!id) return res.status(400).json({ error: "Product ID is required" });

    // 1. Update product details
    const productUpdateData = { ...product };

    try {
      const text = embeddingService.prepareProductText(productUpdateData);
      const embedding = await embeddingService.generateEmbedding(text);
      if (embedding) {
        productUpdateData.embedding = embedding;
      }
    } catch (e) {}

    const { data: updatedProd, error: prodErr } = await supabaseAdmin
      .from("products")
      .update(productUpdateData)
      .eq("id", id)
      .select()
      .single();

    if (prodErr) throw prodErr;

    // 2. Sync colors (delete existing and re-insert if provided)
    if (Array.isArray(colors)) {
      await supabaseAdmin.from("product_colors").delete().eq("product_id", id);
      if (colors.length > 0) {
        const colorInserts = colors.map((c) => ({
          product_id: id,
          color_name: c.color_name,
          color_code: c.color_code || "#000000",
          image_url: c.image_url || "",
        }));
        await supabaseAdmin.from("product_colors").insert(colorInserts);
      }
    }

    // 3. Sync sizes (delete existing and re-insert if provided)
    if (Array.isArray(sizes)) {
      await supabaseAdmin.from("product_sizes").delete().eq("product_id", id);
      if (sizes.length > 0) {
        const sizeInserts = sizes.map((s) => ({
          product_id: id,
          size: s.size,
          stock_quantity: parseInt(s.stock_quantity, 10) || 0,
        }));
        await supabaseAdmin.from("product_sizes").insert(sizeInserts);
      }
    }

    await redisService.delPattern("search:semantic:*");

    return res.status(200).json({ success: true, product: updatedProd });
  } catch (error) {
    return sendError(res, 500, "Failed to update product", error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Product ID is required" });

    // Delete related sizes, colors, notifications, and product
    await supabaseAdmin.from("product_sizes").delete().eq("product_id", id);
    await supabaseAdmin.from("product_colors").delete().eq("product_id", id);
    await supabaseAdmin.from("platform_notifications").delete().eq("related_id", id);

    const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
    if (error) throw error;

    await redisService.delPattern("search:semantic:*");

    return res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "Failed to delete product", error);
  }
};

// ==========================================
// INVENTORY MUTATIONS
// ==========================================

exports.bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Stock updates array is required" });
    }

    // Execute updates
    for (const update of updates) {
      const { product_id, size, stock_quantity } = update;
      if (product_id && size !== undefined && stock_quantity !== undefined) {
        await supabaseAdmin
          .from("product_sizes")
          .update({ stock_quantity: parseInt(stock_quantity, 10) })
          .eq("product_id", product_id)
          .eq("size", size);
      }
    }

    return res.status(200).json({ success: true, message: "Bulk stock updated successfully" });
  } catch (error) {
    return sendError(res, 500, "Failed to update bulk stock", error);
  }
};

// ==========================================
// OFFERS & COUPONS MUTATIONS
// ==========================================

exports.createOffer = async (req, res) => {
  try {
    const { offer, notification } = req.body;
    if (!offer || !offer.title) {
      return res.status(400).json({ error: "Offer details are required" });
    }

    const { data: newOffer, error: offerErr } = await supabaseAdmin
      .from("offers")
      .insert([offer])
      .select()
      .single();

    if (offerErr) throw offerErr;

    if (notification && newOffer) {
      await supabaseAdmin.from("platform_notifications").insert([
        {
          title: notification.title || "Special Deal Available!",
          message: notification.message || `${offer.title} is now active!`,
          type: "deal",
          target_audience: "all",
          related_id: newOffer.id,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return res.status(201).json({ success: true, offer: newOffer });
  } catch (error) {
    return sendError(res, 500, "Failed to create offer", error);
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Offer ID is required" });

    await supabaseAdmin.from("platform_notifications").delete().eq("related_id", id);
    const { error } = await supabaseAdmin.from("offers").delete().eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "Failed to delete offer", error);
  }
};

// ==========================================
// ORDERS MUTATIONS
// ==========================================

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: "Order ID and status are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, order: data });
  } catch (error) {
    return sendError(res, 500, "Failed to update order status", error);
  }
};

exports.updateOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipping_carrier, tracking_number, status } = req.body;

    if (!id) return res.status(400).json({ error: "Order ID is required" });

    const updatePayload = {};
    if (shipping_carrier !== undefined) updatePayload.shipping_carrier = shipping_carrier;
    if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
    if (status !== undefined) updatePayload.status = status;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, order: data });
  } catch (error) {
    return sendError(res, 500, "Failed to update order tracking", error);
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Order ID is required" });

    const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "Failed to delete order", error);
  }
};

// ==========================================
// DELIVERY & NOTIFICATIONS MUTATIONS
// ==========================================

exports.updateDeliveryOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, estimated_days, is_active } = req.body;

    if (!id) return res.status(400).json({ error: "Delivery option ID is required" });

    const updatePayload = {};
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (estimated_days !== undefined) updatePayload.estimated_days = estimated_days;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from("delivery_options")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, deliveryOption: data });
  } catch (error) {
    return sendError(res, 500, "Failed to update delivery option", error);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Notification ID is required" });

    const { error } = await supabaseAdmin
      .from("platform_notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    return sendError(res, 500, "Failed to update notification", error);
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Notification ID is required" });

    const { error } = await supabaseAdmin.from("platform_notifications").delete().eq("id", id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    return sendError(res, 500, "Failed to delete notification", error);
  }
};
