function initCart() {
  const cartPanel = document.getElementById("cartPanel");
  const cartOverlay = document.getElementById("cartOverlay");
  const emptyState = document.getElementById("cartEmptyState");
  const filledState = document.getElementById("cartFilledState");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const subtotalValue = document.getElementById("cartSubtotalValue");

  const sideCouponInput = document.getElementById("sideCouponCode");
  const sideApplyCouponBtn = document.getElementById("sideApplyCouponBtn");

  // Load state from localStorage
  let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
  let discountRate = parseFloat(localStorage.getItem("strideDiscount")) || 0;

  function saveCart() {
    localStorage.setItem("strideCart", JSON.stringify(cartItems));
    localStorage.setItem("strideDiscount", discountRate);
    updateCartUI();
    window.dispatchEvent(new Event("cartUpdated")); // Tell shopping page to update
  }

  function updateCartUI() {
    const cartBadgeCount = document.querySelector(".cart-badge");

    // Calculate total items (accounting for quantities)
    const totalCount = cartItems.reduce(
      (sum, item) => sum + (item.quantity || 1),
      0,
    );

    if (cartItems.length === 0) {
      if (emptyState) emptyState.style.display = "flex";
      if (filledState) filledState.style.display = "none";
      if (cartBadgeCount) cartBadgeCount.style.display = "none";
    } else {
      if (emptyState) emptyState.style.display = "none";
      if (filledState) filledState.style.display = "flex";
      if (cartBadgeCount) {
        cartBadgeCount.style.display = "flex";
        cartBadgeCount.textContent = totalCount;
      }
      renderCartItems();
    }
  }

  function renderCartItems() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";
    let subtotal = 0;

    cartItems.forEach((item, index) => {
      const qty = item.quantity || 1;
      subtotal += item.price * qty;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.innerHTML = `
        <div class="cart-item-image">
          <img src="${item.img}" alt="${item.name}" />
        </div>
        <div class="cart-item-details">
          <h4 class="item-title">${item.name}</h4>
          <p class="item-size">${item.brand}</p>
          <div class="item-pricing">
            <span class="price-discount">Rs.${item.price.toFixed(2)}</span>
          </div>
          <div class="item-actions-wrapper">
            <div class="quantity-control">
              <button class="qty-btn side-minus" data-index="${index}"><i class="bi bi-dash"></i></button>
              <span class="qty-value">${qty}</span>
              <button class="qty-btn side-plus" data-index="${index}"><i class="bi bi-plus"></i></button>
            </div>
            <div class="item-actions-extra">
              <button class="action-btn side-remove" data-index="${index}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(itemEl);
    });

    if (subtotalValue) {
      const finalTotal = subtotal - subtotal * discountRate;
      subtotalValue.textContent = `Rs.${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} PKR`;
    }
  }

  function openCart() {
    // Refresh memory before opening
    cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    discountRate = parseFloat(localStorage.getItem("strideDiscount")) || 0;
    updateCartUI();
    if (cartPanel) cartPanel.classList.add("open");
    if (cartOverlay) cartOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    if (cartPanel) cartPanel.classList.remove("open");
    if (cartOverlay) cartOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  // --- Recommendation Slider Logic ---
  const recTrack = document.getElementById("recTrack");
  const recPrevBtn = document.getElementById("recPrevBtn");
  const recNextBtn = document.getElementById("recNextBtn");

  if (recPrevBtn && recNextBtn && recTrack) {
    recNextBtn.addEventListener("click", () => {
      recTrack.scrollBy({ left: recTrack.clientWidth, behavior: "smooth" });
    });
    recPrevBtn.addEventListener("click", () => {
      recTrack.scrollBy({ left: -recTrack.clientWidth, behavior: "smooth" });
    });
  }

  // --- Global Listeners ---
  document.addEventListener("click", (e) => {
    // Open cart
    if (e.target.closest(".cart-btn") && !e.target.closest(".add-to-cart")) {
      e.preventDefault();
      openCart();
    }
    // Close cart
    if (
      e.target.closest("#closeCartBtn") ||
      e.target.id === "cartOverlay" ||
      e.target.closest("#continueShoppingBtn")
    ) {
      e.preventDefault();
      closeCart();
    }

    // Add to cart from Main Store
    const addToCartBtn = e.target.closest(".add-to-cart");
    if (addToCartBtn) {
      e.preventDefault();
      const productCard = addToCartBtn.closest(".product-card");
      if (productCard) {
        const name = productCard.querySelector(".product-name").textContent;
        const brand = productCard.querySelector(".product-brand").textContent;
        const priceText =
          productCard.querySelector(".product-price").textContent;
        const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
        const img = productCard.querySelector("img").src;

        // Check if item exists to increase quantity
        const existingItem = cartItems.find((i) => i.name === name);
        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cartItems.push({ name, brand, price, img, quantity: 1 });
        }

        saveCart();
        if (typeof showToast === "function")
          showToast(`${name} added to cart!`);
      }
    }

    // Add to cart from Recommendations
    const recAddBtn = e.target.closest(".rec-add-btn");
    if (recAddBtn) {
      e.preventDefault();
      const recItem = recAddBtn.closest(".recommendation-item");
      if (recItem) {
        const name = recItem.querySelector(".rec-title").textContent;
        const priceText = recItem.querySelector(".rec-price").textContent;
        const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
        const img = recItem.querySelector("img").src;

        const existingItem = cartItems.find((i) => i.name === name);
        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cartItems.push({ name, brand: "S", price, img, quantity: 1 });
        }

        saveCart();
        if (typeof showToast === "function")
          showToast(`${name} added to cart!`);
      }
    }

    // Control Quantity & Remove inside Side Cart
    const plusBtn = e.target.closest(".side-plus");
    const minusBtn = e.target.closest(".side-minus");
    const removeBtn = e.target.closest(".side-remove");

    if (plusBtn) {
      const index = plusBtn.dataset.index;
      cartItems[index].quantity = (cartItems[index].quantity || 1) + 1;
      saveCart();
    } else if (minusBtn) {
      const index = minusBtn.dataset.index;
      if (cartItems[index].quantity > 1) {
        cartItems[index].quantity -= 1;
        saveCart();
      }
    } else if (removeBtn) {
      const index = removeBtn.dataset.index;
      cartItems.splice(index, 1);
      saveCart();
    }
  });

  // Apply Coupon in Sidebar
  if (sideApplyCouponBtn) {
    sideApplyCouponBtn.addEventListener("click", () => {
      const code = sideCouponInput.value.trim().toUpperCase();
      if (code === "STRIDE10") {
        discountRate = 0.1;
        if (typeof showToast === "function") showToast(`10% Coupon Applied!`);
      } else {
        discountRate = 0;
        if (typeof showToast === "function") showToast(`Invalid Coupon`);
      }
      saveCart();
    });
  }

  // Keep synced if modified from Shopping Cart Page
  window.addEventListener("cartUpdated", () => {
    cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    discountRate = parseFloat(localStorage.getItem("strideDiscount")) || 0;
    updateCartUI();
  });

  updateCartUI();
}
