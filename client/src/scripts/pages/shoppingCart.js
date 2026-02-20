document.addEventListener("DOMContentLoaded", () => {
  const emptyState = document.getElementById("cartPageEmpty");
  const filledState = document.getElementById("cartPageFilled");
  const itemsContainer = document.getElementById("cartPageItemsContainer");
  const subtotalValue = document.getElementById("pageSubtotalValue");

  const couponInput = document.getElementById("pageCouponCode");
  const applyCouponBtn = document.getElementById("applyPageCouponBtn");
  const couponMessage = document.getElementById("pageCouponMessage");

  // Load items from localStorage (Synced with side cart)
  let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
  let discountRate = parseFloat(localStorage.getItem("strideDiscount")) || 0;

  function saveCart() {
    localStorage.setItem("strideCart", JSON.stringify(cartItems));
    localStorage.setItem("strideDiscount", discountRate);
    renderPageCart();
    // Dispatch event so side cart updates immediately if open
    window.dispatchEvent(new Event("cartUpdated"));
  }

  function renderPageCart() {
    if (cartItems.length === 0) {
      emptyState.style.display = "flex";
      filledState.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    filledState.style.display = "block";
    itemsContainer.innerHTML = "";

    let subtotal = 0;

    cartItems.forEach((item, index) => {
      // Calculate individual item totals
      const itemTotal = item.price * (item.quantity || 1);
      subtotal += itemTotal;

      const itemRow = document.createElement("div");
      itemRow.className = "cart-page-item";
      itemRow.innerHTML = `
        <div class="col-product-wrap">
          <img src="${item.img}" alt="${item.name}">
          <div class="product-info">
            <h4>${item.name}</h4>
            <p>Size: <strong>${item.brand}</strong></p>
            <div class="product-actions">
              <button><i class="bi bi-pencil-square"></i></button>
              <button class="remove-page-item" data-index="${index}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
        <div class="col-price-wrap">
          <span class="price-old">Rs.${(item.price * 1.2).toFixed(2)}</span>
          <span class="price-new">Rs.${item.price.toFixed(2)}</span>
        </div>
        <div class="col-qty-wrap">
          <div class="quantity-control">
            <button class="qty-btn minus-btn" data-index="${index}"><i class="bi bi-dash"></i></button>
            <span class="qty-value">${item.quantity || 1}</span>
            <button class="qty-btn plus-btn" data-index="${index}"><i class="bi bi-plus"></i></button>
          </div>
        </div>
        <div class="col-total-wrap">
          Rs.${itemTotal.toFixed(2)}
        </div>
      `;
      itemsContainer.appendChild(itemRow);
    });

    // Apply Coupon Logic
    const finalTotal = subtotal - subtotal * discountRate;
    subtotalValue.textContent = `Rs.${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} PKR`;
  }

  // Event Delegation for Qty and Remove
  itemsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-page-item");
    const plusBtn = e.target.closest(".plus-btn");
    const minusBtn = e.target.closest(".minus-btn");

    if (removeBtn) {
      const index = removeBtn.dataset.index;
      cartItems.splice(index, 1);
      saveCart();
    } else if (plusBtn) {
      const index = plusBtn.dataset.index;
      cartItems[index].quantity = (cartItems[index].quantity || 1) + 1;
      saveCart();
    } else if (minusBtn) {
      const index = minusBtn.dataset.index;
      if (cartItems[index].quantity > 1) {
        cartItems[index].quantity -= 1;
        saveCart();
      }
    }
  });

  // Coupon Logic
  applyCouponBtn.addEventListener("click", () => {
    const code = couponInput.value.trim().toUpperCase();
    if (code === "STRIDE10") {
      discountRate = 0.1; // 10% off
      couponMessage.textContent = "Coupon applied! 10% off.";
      couponMessage.className = "coupon-message success";
    } else {
      discountRate = 0;
      couponMessage.textContent = "Invalid coupon code.";
      couponMessage.className = "coupon-message error";
    }
    saveCart();
  });

  // Keep synced if modified from another tab or component
  window.addEventListener("cartUpdated", () => {
    cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    discountRate = parseFloat(localStorage.getItem("strideDiscount")) || 0;
    renderPageCart();
  });

  renderPageCart();
});
