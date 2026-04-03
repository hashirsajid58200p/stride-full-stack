document.addEventListener("DOMContentLoaded", () => {
  const emptyState = document.getElementById("cartPageEmpty");
  const filledState = document.getElementById("cartPageFilled");
  const itemsContainer = document.getElementById("cartPageItemsContainer");

  // Pricing Elements
  const subtotalValue = document.getElementById("pageSubtotalValue");
  const discountRow = document.getElementById("shoppingCartDiscountRow");
  const discountValue = document.getElementById("shoppingCartDiscountValue");

  const recommendationsSection = document.getElementById(
    "cartRecommendationsSection",
  );
  const relatedProductsGrid = document.getElementById("related-products-grid");

  // Load items from localStorage (Synced with side cart)
  let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
  let currentSubtotal = 0;
  let currentDiscount = parseFloat(localStorage.getItem("strideDiscount")) || 0;

  // Listen for the global currency engine finishing its background load
  window.addEventListener("currencyUpdated", () => {
    renderPageCart();
  });

  function saveCart() {
    localStorage.setItem("strideCart", JSON.stringify(cartItems));
    renderPageCart();
    fetchCartRecommendations(); // Update recommendations when cart changes
    window.dispatchEvent(new Event("cartUpdated")); // Tell side cart to update
  }

  function renderPageCart() {
    if (cartItems.length === 0) {
      emptyState.style.display = "flex";
      filledState.style.display = "none";
      if (recommendationsSection) recommendationsSection.style.display = "none";

      // Reset discount if cart is emptied
      currentDiscount = 0;
      localStorage.removeItem("strideDiscount");
      if (typeof window.resetCouponComponent === "function")
        window.resetCouponComponent();
      return;
    }

    emptyState.style.display = "none";
    filledState.style.display = "block";
    itemsContainer.innerHTML = "";

    currentSubtotal = 0;

    cartItems.forEach((item, index) => {
      // Calculate individual item totals
      const itemTotal = item.price * (item.quantity || 1);
      currentSubtotal += itemTotal;

      const itemSize = item.size || "Standard";
      const itemColor = item.color || "Default";

      const itemRow = document.createElement("div");
      itemRow.className = "cart-page-item";
      // FIX: Replaced hardcoded $ with window.formatPrice()
      itemRow.innerHTML = `
        <div class="col-product-wrap">
          <img src="${item.img}" alt="${item.name}">
          <div class="product-info">
            <p class="product-brand-tag">${item.brand}</p>
            <h4>${item.name}</h4>
            <p>Size: <strong>${itemSize}</strong> | Color: <strong>${itemColor}</strong></p>
            <div class="product-actions">
              <button class="remove-page-item" data-index="${index}" title="Remove Item"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
        <div class="col-price-wrap">
          <span class="price-current">${window.formatPrice(item.price)}</span>
        </div>
        <div class="col-qty-wrap">
          <div class="quantity-control">
            <button class="qty-btn minus-btn" data-index="${index}"><i class="bi bi-dash"></i></button>
            <span class="qty-value">${item.quantity || 1}</span>
            <button class="qty-btn plus-btn" data-index="${index}"><i class="bi bi-plus"></i></button>
          </div>
        </div>
        <div class="col-total-wrap">
          ${window.formatPrice(itemTotal)}
        </div>
      `;
      itemsContainer.appendChild(itemRow);
    });

    // Fetch saved discount if user navigates back
    const savedDiscount =
      parseFloat(localStorage.getItem("strideDiscount")) || 0;
    if (savedDiscount > 0 && currentDiscount === 0) {
      currentDiscount = savedDiscount;
    }

    // Toggle Discount UI
    if (currentDiscount > 0) {
      if (discountRow) discountRow.style.display = "flex";
      if (discountValue)
        discountValue.textContent = "-" + window.formatPrice(currentDiscount);
    } else {
      if (discountRow) discountRow.style.display = "none";
    }

    // Output calculated Subtotal
    if (subtotalValue) {
      const finalTotal = Math.max(0, currentSubtotal - currentDiscount);
      subtotalValue.textContent = window.formatPrice(finalTotal);
    }
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

  // Keep synced if modified from another tab or side cart component
  window.addEventListener("cartUpdated", () => {
    cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    currentDiscount = parseFloat(localStorage.getItem("strideDiscount")) || 0;
    renderPageCart();
    fetchCartRecommendations();
  });

  // ==========================================
  // COMPONENT LOADER: Coupon
  // ==========================================
  async function loadCouponComponent() {
    try {
      const response = await fetch("../components/coupon.html");
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      const placeholder = document.getElementById(
        "shopping-cart-coupon-placeholder",
      );
      if (placeholder) {
        const scripts = wrapper.querySelectorAll("script");

        while (wrapper.firstChild) {
          if (wrapper.firstChild.tagName !== "SCRIPT") {
            placeholder.appendChild(wrapper.firstChild);
          } else {
            wrapper.removeChild(wrapper.firstChild);
          }
        }

        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });

        // Give DOM a tiny tick to attach elements before init
        setTimeout(() => {
          if (typeof window.initCouponComponent === "function") {
            window.initCouponComponent();
          }
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load shopping cart coupon component", err);
    }
  }
  loadCouponComponent();

  // Listen for Coupon Validation from the Component
  window.addEventListener("couponApplied", (e) => {
    const offer = e.detail.offer;

    let calculatedDiscount = 0;
    let successMessage = "";

    if (offer.type === "coupon") {
      calculatedDiscount = currentSubtotal * (offer.discount_percentage / 100);
      successMessage = `${offer.discount_percentage}% General Discount Applied!`;
    } else if (offer.type === "product") {
      let targetItemTotal = 0;
      cartItems.forEach((item) => {
        if (item.id === offer.target_product_id) {
          targetItemTotal += item.price * item.quantity;
        }
      });

      if (targetItemTotal > 0) {
        calculatedDiscount =
          targetItemTotal * (offer.discount_percentage / 100);
        successMessage = `${offer.discount_percentage}% Product Discount Applied!`;
      } else {
        // Validation Failed Contextually - Reset the component!
        if (typeof window.resetCouponComponent === "function")
          window.resetCouponComponent();
        if (typeof window.showToast === "function")
          window.showToast(
            "This discount code does not apply to any items in your cart.",
            "error",
          );
        return;
      }
    }

    currentDiscount = calculatedDiscount;

    // Save global discount so it persists across page navigations
    localStorage.setItem("strideDiscount", currentDiscount);

    renderPageCart();

    if (typeof window.showToast === "function") {
      window.showToast(successMessage, "success");
    }
  });

  renderPageCart();

  // ==========================================
  // DYNAMIC "YOU MAY ALSO LIKE" SECTION
  // ==========================================

  async function loadSkeletonComponent() {
    if (!window.renderSkeletonCardTemplate) {
      try {
        const response = await fetch("../components/skeletonAnimation.html");
        const html = await response.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });
      } catch (err) {
        console.error("Failed to load skeleton component:", err);
      }
    }
  }

  async function loadProductCardsComponent() {
    if (!window.renderProductCardTemplate) {
      try {
        const response = await fetch("../components/productCards.html");
        const html = await response.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });
      } catch (err) {
        console.error("Failed to load productCards component:", err);
      }
    }
  }

  async function fetchCartRecommendations() {
    if (!relatedProductsGrid || !recommendationsSection) return;

    try {
      if (!window.supabase) {
        window.addEventListener(
          "supabaseInitialized",
          fetchCartRecommendations,
        );
        return;
      }

      // Hide section if cart is empty
      if (cartItems.length === 0) {
        recommendationsSection.style.display = "none";
        return;
      }

      recommendationsSection.style.display = "block";
      await loadSkeletonComponent();

      // Inject exactly 2 skeletons for the grid
      relatedProductsGrid.innerHTML = window.renderSkeletonCardTemplate(2);

      await loadProductCardsComponent();

      // Smart Logic: Find brand of the most recently added item in cart
      const currentBrand = cartItems[cartItems.length - 1].brand;

      // Fetch products matching that brand
      const { data: products, error } = await window.supabase
        .from("products")
        .select(`*, product_sizes ( size ), reviews( rating )`)
        .eq("brand", currentBrand)
        .limit(10); // Fetch a pool

      if (error) throw error;

      if (products && products.length > 0) {
        // Filter out products already in the user's cart
        const cartItemNames = cartItems.map((item) => item.name);
        const filteredProducts = products.filter(
          (p) => !cartItemNames.includes(p.name),
        );

        if (filteredProducts.length === 0) {
          recommendationsSection.style.display = "none";
          return;
        }

        // Shuffle and grab exactly 2 items
        const shuffled = filteredProducts.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);

        const cardsHTML = selected
          .map((p, index) =>
            window.renderProductCardTemplate
              ? window.renderProductCardTemplate(p, index)
              : "",
          )
          .join("");

        relatedProductsGrid.innerHTML = cardsHTML;
        attachWishlistCardListeners();
      } else {
        recommendationsSection.style.display = "none";
      }
    } catch (error) {
      console.error("Error fetching recommended products:", error);
      recommendationsSection.style.display = "none";
    }
  }

  function attachWishlistCardListeners() {
    const wishlistBtns = document.querySelectorAll(".action-btn-wishlist");
    wishlistBtns.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        newBtn.classList.toggle("active");
        const icon = newBtn.querySelector("i");
        if (newBtn.classList.contains("active")) {
          icon.classList.remove("bi-heart");
          icon.classList.add("bi-heart-fill");
          if (typeof window.showToast === "function")
            window.showToast("Added to wishlist!");
        } else {
          icon.classList.remove("bi-heart-fill");
          icon.classList.add("bi-heart");
          if (typeof window.showToast === "function")
            window.showToast("Removed from wishlist");
        }
      });
    });
  }

  // Trigger the fetch automatically
  fetchCartRecommendations();
});
