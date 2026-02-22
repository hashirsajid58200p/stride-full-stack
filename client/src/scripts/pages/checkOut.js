document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // Step Navigation Logic
  // ==========================================
  const form1 = document.getElementById("form-step-1");
  const form2 = document.getElementById("form-step-2");
  const form3 = document.getElementById("form-step-3");

  // Custom Dropdown Elements
  const customSelectWrapper = document.getElementById("countryDropdownWrapper");
  const customSelectDisplay = document.getElementById("countryDropdownDisplay");
  const customSelectText = document.getElementById("countryDropdownText");
  const customSelectOptions = document.querySelectorAll(
    "#countryDropdownOptions .custom-select-option",
  );
  const countryInputHidden = document.getElementById("chk-country");
  const countryErrorMsg = document.getElementById("country-error");

  // --- Custom Dropdown Logic (Country) ---
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
        customSelectDisplay.classList.add("has-value"); // Changes color to normal text
        countryInputHidden.value = value;
        countryErrorMsg.style.display = "none"; // Hide error if user fixed it

        customSelectWrapper.classList.remove("open");
      });
    });

    document.addEventListener("click", (e) => {
      if (!customSelectWrapper.contains(e.target)) {
        customSelectWrapper.classList.remove("open");
      }
    });
  }

  // Step 1 to Step 2
  if (form1) {
    form1.addEventListener("submit", (e) => {
      e.preventDefault();

      // Validate Custom Country Dropdown before proceeding
      if (countryInputHidden.value === "") {
        countryErrorMsg.style.display = "block";
        customSelectDisplay.style.borderColor = "#ef4444";
        return; // Stop form submission
      } else {
        customSelectDisplay.style.borderColor = "";
      }

      // Transfer data to Step 2 summary
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

  // Step 2 to Step 3
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
      const shippingCost =
        selectedShipping.value === "0"
          ? "Free"
          : `$${parseFloat(selectedShipping.value).toFixed(2)}`;

      document.getElementById("summary-shipping").textContent =
        `${shippingTitle} - ${shippingCost}`;

      goToStep(3);
    });
  }

  // Step 3 (Final Purchase)
  if (form3) {
    form3.addEventListener("submit", (e) => {
      e.preventDefault();

      if (typeof window.showToast === "function") {
        window.showToast("Payment Successful! Processing your order...");
      } else {
        alert("Payment Successful! Processing your order...");
      }

      setTimeout(() => {
        localStorage.removeItem("strideCart");
        window.location.href = "clientDashboard.html?view=orders";
      }, 2000);
    });
  }

  // Handle Radio Button changes on Step 2 to live-update totals
  const shippingRadios = document.querySelectorAll(
    'input[name="shipping-rate"]',
  );
  shippingRadios.forEach((radio) => {
    radio.addEventListener("change", updateTotals);
  });

  // Global Step Navigation Function
  window.goToStep = function (stepNumber) {
    document.querySelectorAll(".checkout-step").forEach((step) => {
      step.classList.remove("active");
    });

    document.querySelectorAll(".step").forEach((indicator) => {
      indicator.classList.remove("active", "completed");
    });
    document.querySelectorAll(".progress-line").forEach((line) => {
      line.classList.remove("completed");
    });

    document.getElementById(`step-${stepNumber}`).classList.add("active");
    document
      .getElementById(`indicator-step-${stepNumber}`)
      .classList.add("active");

    if (stepNumber >= 2) {
      document
        .getElementById("indicator-step-1")
        .classList.replace("active", "completed");
      document.querySelectorAll(".progress-line")[0].classList.add("completed");
    }
    if (stepNumber >= 3) {
      document
        .getElementById("indicator-step-2")
        .classList.replace("active", "completed");
      document.querySelectorAll(".progress-line")[1].classList.add("completed");
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
  let currentDiscount = 0;

  function loadCartItems() {
    let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];

    // Provide Dummy Data if cart is empty for demonstration purposes
    if (cartItems.length === 0) {
      cartItems = [
        {
          name: "Nike Air Max Fusion",
          brand: "Nike",
          price: 149.99,
          quantity: 1,
          img: "../../public/images/shoe-1.jpg",
        },
        {
          name: "Adidas Ultraboost 23",
          brand: "Adidas",
          price: 179.99,
          quantity: 1,
          img: "../../public/images/shoe-2.jpg",
        },
      ];
    }

    orderItemsContainer.innerHTML = "";
    currentSubtotal = 0;

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
          <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
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

    const finalTotal = currentSubtotal + shippingCost - currentDiscount;

    subtotalEl.textContent = `$${currentSubtotal.toFixed(2)}`;
    shippingEl.textContent =
      shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`;
    totalEl.textContent = `$${finalTotal.toFixed(2)}`;
  }

  // ==========================================
  // Coupon Logic
  // ==========================================
  const applyCouponBtn = document.getElementById("apply-coupon");
  const couponInput = document.getElementById("coupon-code");

  if (applyCouponBtn && couponInput) {
    applyCouponBtn.addEventListener("click", () => {
      const code = couponInput.value.trim().toUpperCase();

      if (code === "STRIDE10") {
        currentDiscount = currentSubtotal * 0.1;
        discountRow.style.display = "flex";
        discountEl.textContent = `-$${currentDiscount.toFixed(2)}`;
        couponInput.value = "";
        couponInput.placeholder = "Code STRIDE10 Applied!";
        couponInput.disabled = true;
        applyCouponBtn.disabled = true;

        updateTotals();

        if (typeof window.showToast === "function")
          window.showToast("10% Discount Applied!");
      } else if (code !== "") {
        if (typeof window.showToast === "function") {
          window.showToast("Invalid discount code.");
        } else {
          alert("Invalid discount code.");
        }
      }
    });
  }

  // Initialize page
  loadCartItems();
});
