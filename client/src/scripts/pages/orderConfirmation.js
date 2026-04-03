document.addEventListener("DOMContentLoaded", () => {
  const orderIdDisplay = document.getElementById("display-order-id");
  const itemsList = document.getElementById("items-list");
  const subtotalEl = document.getElementById("conf-subtotal");
  const discountRow = document.getElementById("conf-discount-row");
  const discountEl = document.getElementById("conf-discount");
  const totalEl = document.getElementById("conf-total");

  // 1. Get the Stripe Session ID from the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  if (sessionId) {
    // Generate Order ID
    const shortId = "ORD-" + sessionId.substring(8, 16).toUpperCase();
    orderIdDisplay.textContent = shortId;

    // 2. Read the cart BEFORE we clear it
    const currentCart = JSON.parse(localStorage.getItem("strideCart"));
    const currentDiscount =
      parseFloat(localStorage.getItem("strideDiscount")) || 0;

    // If the cart exists, save it as "Last Order" so it survives page refreshes
    if (currentCart && currentCart.length > 0) {
      const orderData = {
        items: currentCart,
        discount: currentDiscount,
      };
      localStorage.setItem("strideLastOrder", JSON.stringify(orderData));

      // NOW we clear the active cart
      localStorage.removeItem("strideCart");
      localStorage.removeItem("strideDiscount");
      localStorage.removeItem("strideAppliedOffer");
      window.dispatchEvent(new Event("cartUpdated"));
    }

    // 3. Render the Receipt
    const lastOrder = JSON.parse(localStorage.getItem("strideLastOrder"));

    if (lastOrder && lastOrder.items) {
      let subtotal = 0;

      // Loop through saved items and generate HTML with small images and quantity badges
      itemsList.innerHTML = lastOrder.items
        .map((item) => {
          const itemTotal = item.price * (item.quantity || 1);
          subtotal += itemTotal;

          const size = item.size || "Standard";
          const color = item.color || "Default";

          // FIX: Swapped hardcoded $ format for dynamic window.formatPrice()
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
            <span class="item-price">${window.formatPrice(itemTotal)}</span>
          </div>
        `;
        })
        .join("");

      // Calculate final totals
      const finalTotal = Math.max(0, subtotal - lastOrder.discount);

      // FIX: Apply dynamic currency formatter to all totals
      subtotalEl.textContent = window.formatPrice(subtotal);

      if (lastOrder.discount > 0) {
        discountRow.style.display = "flex";
        discountEl.textContent = "-" + window.formatPrice(lastOrder.discount);
      }

      totalEl.textContent = window.formatPrice(finalTotal);
    } else {
      itemsList.innerHTML = `<p class="text-muted">Order details unavailable.</p>`;
    }
  } else {
    // No session ID found in URL
    orderIdDisplay.textContent = "Unknown";
    orderIdDisplay.style.color = "var(--color-muted-fg)";
    itemsList.innerHTML = `<p class="text-muted">No recent order found.</p>`;
  }
});
