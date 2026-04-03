// client/src/scripts/pages/checkOut.js

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // Step Navigation Logic
  // ==========================================
  const form1 = document.getElementById("form-step-1");
  const form2 = document.getElementById("form-step-2");

  const customSelectWrapper = document.getElementById("countryDropdownWrapper");
  const customSelectDisplay = document.getElementById("countryDropdownDisplay");
  const customSelectText = document.getElementById("countryDropdownText");
  const customSelectOptions = document.querySelectorAll(
    "#countryDropdownOptions .custom-select-option",
  );
  const countryInputHidden = document.getElementById("chk-country");
  const countryErrorMsg = document.getElementById("country-error");

  // FIX: Load the globally saved offer if the user applied it in shoppingCart.html
  let appliedOffer = null;
  const savedOfferStr = localStorage.getItem("strideAppliedOffer");
  if (savedOfferStr) {
    try {
      appliedOffer = JSON.parse(savedOfferStr);
    } catch (e) {
      console.error("Failed to parse saved offer in checkout");
    }
  }

  // ==========================================
  // CURRENCY ENGINE INTEGRATION
  // ==========================================
  const expressShippingDisplay = document.getElementById(
    "express-shipping-display",
  );

  // Format the Express Shipping display on load
  if (expressShippingDisplay && typeof window.formatPrice === "function") {
    expressShippingDisplay.textContent = window.formatPrice(15.0);
  }

  // Listen for the global currency engine finishing its background load
  window.addEventListener("currencyUpdated", () => {
    if (expressShippingDisplay) {
      expressShippingDisplay.textContent = window.formatPrice(15.0);
    }
    loadCartItems(); // Re-render the cart items and totals with the new currency
  });

  if (customSelectWrapper) {
    customSelectDisplay.addEventListener("click", () => {
      customSelectWrapper.classList.toggle("open");
    });

    customSelectOptions.forEach((option) => {
      option.addEventListener("click", function () {
        customSelectOptions.forEach((opt) => opt.classList.remove("selected"));
        this.classList.add("selected");

        const value = this.getAttribute("data-value");
        const text = this.textContent;

        customSelectText.textContent = text;
        customSelectDisplay.classList.add("has-value");
        countryInputHidden.value = value;
        countryErrorMsg.style.display = "none";

        customSelectWrapper.classList.remove("open");
      });
    });

    document.addEventListener("click", (e) => {
      if (!customSelectWrapper.contains(e.target)) {
        customSelectWrapper.classList.remove("open");
      }
    });
  }

  if (form1) {
    form1.addEventListener("submit", (e) => {
      e.preventDefault();

      if (countryInputHidden.value === "") {
        countryErrorMsg.style.display = "block";
        customSelectDisplay.style.borderColor = "#ef4444";
        return;
      } else {
        customSelectDisplay.style.borderColor = "";
      }

      const email = document.getElementById("chk-email").value;
      const address = document.getElementById("chk-address").value;
      const city = document.getElementById("chk-city").value;
      const country = countryInputHidden.value;

      document.getElementById("summary-email").textContent = email;
      document.getElementById("summary-email-2").textContent = email;

      const fullAddress = `${address}, ${city}, ${country}`;
      document.getElementById("summary-address").textContent = fullAddress;
      document.getElementById("summary-address-2").textContent = fullAddress;

      goToStep(2);
    });
  }

  if (form2) {
    form2.addEventListener("submit", (e) => {
      e.preventDefault();

      updateTotals();

      const selectedShipping = document.querySelector(
        'input[name="shipping-rate"]:checked',
      );
      const shippingTitle =
        selectedShipping.nextElementSibling.querySelector(
          ".shipping-title",
        ).textContent;

      // FIX: Use formatPrice instead of hardcoded $ logic
      const shippingCost =
        selectedShipping.value === "0"
          ? "Free"
          : window.formatPrice(parseFloat(selectedShipping.value));

      document.getElementById("summary-shipping").textContent =
        `${shippingTitle} - ${shippingCost}`;

      goToStep(3);
      initiateStripeCheckout();
    });
  }

  async function initiateStripeCheckout() {
    const cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    const userEmail = document.getElementById("chk-email").value;

    if (cartItems.length === 0) {
      if (typeof window.showToast === "function")
        window.showToast("Your cart is empty!", "error");
      setTimeout(() => goToStep(1), 2000);
      return;
    }

    // MAP OVER CART TO APPLY THE VERIFIED DISCOUNT BEFORE SENDING TO STRIPE!
    const checkoutItems = cartItems.map((item) => {
      let finalPrice = item.price; // Stripe base price MUST remain in USD

      if (appliedOffer) {
        if (appliedOffer.type === "coupon") {
          finalPrice =
            item.price - item.price * (appliedOffer.discount_percentage / 100);
        } else if (
          appliedOffer.type === "product" &&
          item.id === appliedOffer.target_product_id
        ) {
          finalPrice =
            item.price - item.price * (appliedOffer.discount_percentage / 100);
        }
      }

      return {
        ...item,
        price: finalPrice, // Stripe will now receive the discounted price per unit in USD
      };
    });

    try {
      const response = await fetch(
        // Deployment Version
        "/api/payments/create-checkout-session",
        //       Local Version
        // "http://localhost:5000/api/payments/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: checkoutItems,
            customerEmail: userEmail,
          }),
        },
      );

      const session = await response.json();

      if (!response.ok)
        throw new Error(session.error || "Failed to create payment session");

      const stripe = Stripe(window.stripePublishableKey);
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      if (typeof window.showToast === "function") {
        window.showToast("Payment Error: " + error.message, "error");
      } else {
        alert("Payment Error: " + error.message);
      }
      setTimeout(() => goToStep(2), 2500);
    }
  }

  const shippingRadios = document.querySelectorAll(
    'input[name="shipping-rate"]',
  );
  shippingRadios.forEach((radio) => {
    radio.addEventListener("change", updateTotals);
  });

  window.goToStep = function (stepNumber) {
    document.querySelectorAll(".checkout-step").forEach((step) => {
      step.classList.remove("active");
    });

    document.getElementById(`step-${stepNumber}`).classList.add("active");

    document.querySelectorAll(".step").forEach((ind) => {
      ind.classList.remove("active", "completed");
    });
    document.querySelectorAll(".progress-line").forEach((line) => {
      line.classList.remove("completed");
    });

    if (stepNumber === 1) {
      document.getElementById("indicator-step-1").classList.add("active");
    } else if (stepNumber === 2) {
      document.getElementById("indicator-step-1").classList.add("completed");
      document.querySelectorAll(".progress-line")[0].classList.add("completed");
      document.getElementById("indicator-step-2").classList.add("active");
    } else if (stepNumber === 3) {
      document.getElementById("indicator-step-1").classList.add("completed");
      document.querySelectorAll(".progress-line")[0].classList.add("completed");
      document.getElementById("indicator-step-2").classList.add("completed");
      document.querySelectorAll(".progress-line")[1].classList.add("completed");
      document.getElementById("indicator-step-3").classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==========================================
  // Cart Rendering & Pricing Logic
  // ==========================================
  const orderItemsContainer = document.getElementById("checkout-order-items");
  const subtotalEl = document.getElementById("chk-subtotal");
  const shippingEl = document.getElementById("chk-shipping");
  const discountRow = document.getElementById("discount-row");
  const discountEl = document.getElementById("chk-discount");
  const totalEl = document.getElementById("chk-total");

  let currentSubtotal = 0;
  let currentDiscount = parseFloat(localStorage.getItem("strideDiscount")) || 0;
  let cartItems = [];

  function loadCartItems() {
    cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];

    orderItemsContainer.innerHTML = "";
    currentSubtotal = 0;

    if (cartItems.length === 0) {
      orderItemsContainer.innerHTML = `<p style="color: var(--color-muted-fg); text-align: center; padding: 1rem 0;">Your cart is empty.</p>`;
      updateTotals();
      return;
    }

    cartItems.forEach((item) => {
      currentSubtotal += item.price * item.quantity;

      const itemHTML = `
        <div class="order-item">
          <div class="item-img-wrapper">
            <img src="${item.img}" alt="${item.name}">
            <span class="item-badge">${item.quantity}</span>
          </div>
          <div class="item-info">
            <span class="item-name">${item.name}</span>
            <span class="item-brand">${item.brand}</span>
          </div>
          <span class="item-price">${window.formatPrice(item.price * item.quantity)}</span>
        </div>
      `;
      orderItemsContainer.insertAdjacentHTML("beforeend", itemHTML);
    });

    updateTotals();
  }

  function updateTotals() {
    const selectedShipping = document.querySelector(
      'input[name="shipping-rate"]:checked',
    );
    const shippingCost = selectedShipping
      ? parseFloat(selectedShipping.value)
      : 0;

    const finalTotal = Math.max(
      0,
      currentSubtotal + shippingCost - currentDiscount,
    );

    // FIX: Using formatPrice for subtotal, shipping, and total!
    subtotalEl.textContent = window.formatPrice(currentSubtotal);
    shippingEl.textContent =
      shippingCost === 0 ? "Free" : window.formatPrice(shippingCost);
    totalEl.textContent = window.formatPrice(finalTotal);

    if (currentDiscount > 0) {
      discountRow.style.display = "flex";
      discountEl.textContent = "-" + window.formatPrice(currentDiscount);
    } else {
      discountRow.style.display = "none";
    }
  }

  // ==========================================
  // COMPONENT LOADER: Coupon
  // ==========================================
  async function loadCouponComponent() {
    try {
      const response = await fetch("../components/coupon.html");
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      const placeholder = document.getElementById("coupon-placeholder");
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

        setTimeout(() => {
          if (typeof window.initCouponComponent === "function") {
            window.initCouponComponent();
          }
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load coupon component", err);
    }
  }

  window.addEventListener("couponApplied", (e) => {
    const offer = e.detail.offer;
    appliedOffer = offer; // Save object locally for Stripe mapping

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
        if (typeof window.resetCouponComponent === "function")
          window.resetCouponComponent();
        if (typeof window.showToast === "function")
          window.showToast(
            "This discount code does not apply to any items in your cart.",
            "error",
          );
        appliedOffer = null;
        return;
      }
    }

    currentDiscount = calculatedDiscount;
    localStorage.setItem("strideDiscount", currentDiscount);

    updateTotals();

    if (typeof window.showToast === "function") {
      window.showToast(successMessage, "success");
    }
  });

  loadCartItems();
  loadCouponComponent();
});
