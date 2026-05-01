document.addEventListener("DOMContentLoaded", async () => {
  const orderIdDisplay = document.getElementById("display-order-id");
  const customerNameDisplay = document.getElementById("display-customer-name");
  const customerEmailDisplay = document.getElementById(
    "display-customer-email",
  );
  const itemsList = document.getElementById("items-list");
  const subtotalEl = document.getElementById("conf-subtotal");
  const discountRow = document.getElementById("conf-discount-row");
  const discountEl = document.getElementById("conf-discount");
  const totalEl = document.getElementById("conf-total");

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  if (!sessionId) {
    orderIdDisplay.textContent = "Unknown";
    orderIdDisplay.style.color = "var(--color-muted-fg)";
    itemsList.innerHTML = `<p class="text-muted">No recent order found.</p>`;
    return;
  }

  const shortId = "ORD-" + sessionId.substring(8, 16).toUpperCase();
  orderIdDisplay.textContent = shortId;

  async function processOrderToDatabase() {
    if (!window.supabase) {
      await new Promise((resolve) => {
        window.addEventListener("supabaseInitialized", resolve, { once: true });
      });
    }

    const isProcessedKey = `stride_order_processed_${sessionId}`;
    if (localStorage.getItem(isProcessedKey)) return;

    const currentCart = JSON.parse(localStorage.getItem("strideCart"));
    const currentDiscount =
      parseFloat(localStorage.getItem("strideDiscount")) || 0;

    // Robust extraction: Check multiple possible storage keys for checkout data
    let checkoutData =
      JSON.parse(localStorage.getItem("strideCheckoutData")) ||
      JSON.parse(localStorage.getItem("strideGuestInfo")) ||
      {};

    let customerName = "Guest Customer";
    let customerEmail = "guest@stride.com";

    // 1. Prioritize explicitly typed data from Checkout Form
    if (checkoutData.firstName || checkoutData.lastName) {
      customerName =
        `${checkoutData.firstName || ""} ${checkoutData.lastName || ""}`.trim();
    } else if (checkoutData.fullName || checkoutData.name) {
      customerName = checkoutData.fullName || checkoutData.name;
    } else if (window.auth && window.auth.currentUser) {
      // 2. Fallback to Firebase profile
      customerName = window.auth.currentUser.displayName || "Registered User";
    }

    // Capture Email
    if (checkoutData.email) {
      customerEmail = checkoutData.email;
    } else if (window.auth && window.auth.currentUser) {
      customerEmail = window.auth.currentUser.email;
    }

    customerNameDisplay.textContent = customerName;
    customerEmailDisplay.textContent = customerEmail;

    if (currentCart && currentCart.length > 0) {
      try {
        await new Promise((res) => setTimeout(res, 800));

        let subtotal = 0;
        let itemsCount = 0;
        currentCart.forEach((item) => {
          const qty = item.quantity || 1;
          subtotal += item.price * qty;
          itemsCount += qty;
        });

        const finalTotal = Math.max(0, subtotal - currentDiscount);

        const { error: orderError } = await window.supabase
          .from("orders")
          .insert([
            {
              full_name: customerName,
              email: customerEmail,
              total_amount: finalTotal,
              items_count: itemsCount,
              items: currentCart,
              status: "Pending",
              is_manual_override: false,
            },
          ]);

        if (orderError)
          console.error("Failed to insert order to DB:", orderError);

        for (const item of currentCart) {
          const { data: sizeData, error: fetchError } = await window.supabase
            .from("product_sizes")
            .select("stock_quantity")
            .eq("product_id", item.id)
            .eq("size", item.size)
            .single();

          if (!fetchError && sizeData) {
            const purchasedQty = item.quantity || 1;
            const newStock = Math.max(
              0,
              sizeData.stock_quantity - purchasedQty,
            );

            await window.supabase
              .from("product_sizes")
              .update({ stock_quantity: newStock })
              .eq("product_id", item.id)
              .eq("size", item.size);
          }
        }

        localStorage.setItem(isProcessedKey, "true");

        const orderData = {
          customerName: customerName,
          customerEmail: customerEmail,
          items: currentCart,
          discount: currentDiscount,
          total: finalTotal,
          subtotal: subtotal,
        };
        localStorage.setItem("strideLastOrder", JSON.stringify(orderData));

        localStorage.removeItem("strideCart");
        localStorage.removeItem("strideDiscount");
        localStorage.removeItem("strideAppliedOffer");
        localStorage.removeItem("strideCheckoutData");
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err) {
        console.error("Critical error completing order logic:", err);
      }
    }
  }

  await processOrderToDatabase();

  const lastOrder = JSON.parse(localStorage.getItem("strideLastOrder"));

  if (lastOrder) {
    if (lastOrder.customerName)
      customerNameDisplay.textContent = lastOrder.customerName;
    if (lastOrder.customerEmail)
      customerEmailDisplay.textContent = lastOrder.customerEmail;
  }

  if (lastOrder && lastOrder.items) {
    let subtotal = 0;

    itemsList.innerHTML = lastOrder.items
      .map((item) => {
        const itemTotal = item.price * (item.quantity || 1);
        subtotal += itemTotal;
        const size = item.size || "Standard";
        const color = item.color || "Default";

        return `
          <div class="purchased-item">
            <div class="item-details">
              <div class="item-img-wrapper">
                <img src="${item.img}" alt="${item.name}">
                <span class="item-badge">${item.quantity || 1}</span>
              </div>
              <div class="item-text">
                <span class="item-name">${item.name}</span>
                <span class="item-meta">Size: ${size} | Color: ${color}</span>
              </div>
            </div>
            <span class="item-price">${
              typeof window.formatPrice === "function"
                ? window.formatPrice(itemTotal)
                : "$" + itemTotal.toFixed(2)
            }</span>
          </div>
        `;
      })
      .join("");

    const finalTotal = Math.max(0, subtotal - lastOrder.discount);

    if (typeof window.formatPrice === "function") {
      subtotalEl.textContent = window.formatPrice(subtotal);
      if (lastOrder.discount > 0) {
        discountRow.style.display = "flex";
        discountEl.textContent = "-" + window.formatPrice(lastOrder.discount);
      }
      totalEl.textContent = window.formatPrice(finalTotal);
    } else {
      subtotalEl.textContent = "$" + subtotal.toFixed(2);
      if (lastOrder.discount > 0) {
        discountRow.style.display = "flex";
        discountEl.textContent = "-$" + lastOrder.discount.toFixed(2);
      }
      totalEl.textContent = "$" + finalTotal.toFixed(2);
    }
  } else {
    itemsList.innerHTML = `<p class="text-muted">Order details unavailable.</p>`;
  }
});
