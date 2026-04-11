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

  // === DYNAMIC COUNTRIES & BULLETPROOF IP TRACKING ===
  async function loadCountries() {
    try {
      // 1. Fetch all countries
      const response = await fetch(
        "https://restcountries.com/v3.1/all?fields=name",
      );
      if (!response.ok) throw new Error("Network response not ok");

      let countriesData = await response.json();

      // 2. BULLETPROOF IP TRACKING: Bypass Ad-Blockers
      let userCountryName = null;

      try {
        // Attempt 1: ipapi.co (Can be blocked by Brave/Adblockers)
        const res1 = await fetch("https://ipapi.co/json/");
        const data1 = await res1.json();
        userCountryName = data1.country_name;
      } catch (err1) {
        console.warn("Primary IP API blocked. Trying fallback...");
        try {
          // Attempt 2: freeipapi.com (Can sometimes fail CORS)
          const res2 = await fetch("https://freeipapi.com/api/json");
          const data2 = await res2.json();
          userCountryName = data2.countryName;
        } catch (err2) {
          console.warn("Fallback API blocked. Using native timezone map...");
          // Attempt 3: Unblockable Native Timezone Mapping
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

          // Map major timezones to country names that match the REST API
          if (tz.includes("Karachi")) userCountryName = "Pakistan";
          else if (tz.includes("Kolkata") || tz.includes("Calcutta"))
            userCountryName = "India";
          else if (tz.includes("London")) userCountryName = "United Kingdom";
          else if (tz.includes("New_York") || tz.includes("Los_Angeles"))
            userCountryName = "United States";
          else if (tz.includes("Dubai"))
            userCountryName = "United Arab Emirates";
          else if (tz.includes("Riyadh")) userCountryName = "Saudi Arabia";
          else if (tz.includes("Toronto") || tz.includes("Vancouver"))
            userCountryName = "Canada";
          else if (tz.includes("Sydney") || tz.includes("Melbourne"))
            userCountryName = "Australia";
        }
      }

      // 3. Move the detected country to the top of the array
      if (userCountryName) {
        const userIndex = countriesData.findIndex(
          (c) => c.name.common.toLowerCase() === userCountryName.toLowerCase(),
        );
        if (userIndex > -1) {
          // Extract it and push it to the very top
          const userCountryObj = countriesData.splice(userIndex, 1)[0];
          countriesData.unshift(userCountryObj);
        }
      }

      const optionsContainer = document.getElementById(
        "countryDropdownOptions",
      );

      if (optionsContainer) {
        // Clear any previous stubbed options
        const existingOptions = optionsContainer.querySelectorAll(
          ".custom-select-option",
        );
        existingOptions.forEach((opt) => opt.remove());

        // Sort the remaining array alphabetically (ignoring the first item if we pinned the user's country)
        const sortedCountries = userCountryName
          ? [
              countriesData[0],
              ...countriesData
                .slice(1)
                .sort((a, b) => a.name.common.localeCompare(b.name.common)),
            ]
          : countriesData.sort((a, b) =>
              a.name.common.localeCompare(b.name.common),
            );

        // Generate the HTML for the dropdown
        sortedCountries.forEach((country, index) => {
          const optionDiv = document.createElement("div");
          optionDiv.className = "custom-select-option";
          optionDiv.setAttribute("data-value", country.name.common);

          // Add a visual indicator if it's their auto-detected home country
          if (index === 0 && userCountryName) {
            optionDiv.innerHTML = `<strong>${country.name.common} (Detected)</strong>`;
          } else {
            optionDiv.textContent = country.name.common;
          }

          optionsContainer.appendChild(optionDiv);
        });

        // Add search filter functionality
        const searchInput = document.getElementById("countrySearchInput");
        if (searchInput) {
          searchInput.addEventListener("input", function () {
            const term = this.value.toLowerCase().trim();
            const allOptions = document.querySelectorAll(
              "#countryDropdownOptions .custom-select-option",
            );
            allOptions.forEach((opt) => {
              const matches = opt.textContent.toLowerCase().includes(term);
              opt.style.display = matches ? "block" : "none";
            });
          });
        }

        // 4. Auto-select the user's country so they don't even have to click the dropdown
        if (userCountryName) {
          const firstOption = document.querySelector(
            "#countryDropdownOptions .custom-select-option",
          );
          if (
            firstOption &&
            firstOption.getAttribute("data-value").toLowerCase() ===
              userCountryName.toLowerCase()
          ) {
            // Simulate a click on the option to update the UI and hidden inputs
            firstOption.click();
            console.log(
              `✅ Bulletproof IP Tracked: Auto-selected ${userCountryName}`,
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to load countries:", error);
    }
  }

  if (customSelectWrapper) {
    customSelectDisplay.addEventListener("click", () => {
      customSelectWrapper.classList.toggle("open");
    });

    // Event delegation for dynamically loaded country options
    const countryOptionsContainer = document.getElementById(
      "countryDropdownOptions",
    );
    if (countryOptionsContainer) {
      countryOptionsContainer.addEventListener("click", function (e) {
        const option = e.target.closest(".custom-select-option");
        if (option) {
          document
            .querySelectorAll("#countryDropdownOptions .custom-select-option")
            .forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");

          const value = option.getAttribute("data-value");
          // Clean the "(Detected)" text out if they click their own country
          const text = option.textContent.replace("(Detected)", "").trim();

          customSelectText.textContent = text;
          customSelectDisplay.classList.add("has-value");
          countryInputHidden.value = value;
          countryErrorMsg.style.display = "none";

          customSelectWrapper.classList.remove("open");

          // Clear search input after selection
          const searchInput = document.getElementById("countrySearchInput");
          if (searchInput) searchInput.value = "";
        }
      });
    }

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

  // Load countries dynamically when page loads
  loadCountries();
});
