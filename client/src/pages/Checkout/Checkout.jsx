import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import Coupon from "../../components/ECommerce/Coupon";
import styles from "./Checkout.module.css";
import { useCurrency } from "../../context/CurrencyContext";

export default function Checkout() {
  const navigate = useNavigate();
  const { currency, rate, symbol } = useCurrency();
  const { cartItems, discount, setDiscount } = useCart();

  // Step Navigation
  const [step, setStep] = useState(1);
  const flowRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    fname: "",
    lname: "",
    address: "",
    apartment: "",
    city: "",
    postal: "",
    country: "",
  });
  const [countryError, setCountryError] = useState(false);

  // Dropdown State
  const [countries, setCountries] = useState([]);
  const [searchCountryQuery, setSearchCountryQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Shipping & Payment State
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShippingCost, setSelectedShippingCost] = useState(0);
  const [selectedShippingTitle, setSelectedShippingTitle] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Discount / Coupon State
  const [appliedOffer, setAppliedOffer] = useState(null);

  // Identify which item gets the discount for UI display
  const discountedItemId = React.useMemo(() => {
    if (!appliedOffer || cartItems.length === 0) return null;
    if (appliedOffer.type === "product") return appliedOffer.target_product_id;
    
    // Overall coupon -> Most expensive item
    let maxPrice = -1;
    let targetId = null;
    cartItems.forEach(item => {
      if (item.price > maxPrice) {
        maxPrice = item.price;
        targetId = item.id;
      }
    });
    return targetId;
  }, [appliedOffer, cartItems]);

  // Calculate Subtotals
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const finalTotal = Math.max(0, subtotal + selectedShippingCost - discount);

  // ==========================================
  // BULLETPROOF IP TRACKING & COUNTRIES LOAD
  // ==========================================
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name",
        );
        if (!response.ok) throw new Error("Network response not ok");
        let countriesData = await response.json();

        let userCountryName = null;
        try {
          // Use a more robust geo-location logic
          const getGeo = async () => {
            try {
              // Try ipapi with a timeout
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 2000);
              const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
              clearTimeout(id);
              if (res.ok) return (await res.json()).country_name;
            } catch (e) {}

            try {
              // Try freeipapi with a timeout
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 2000);
              const res = await fetch("https://freeipapi.com/api/json", { signal: controller.signal });
              clearTimeout(id);
              if (res.ok) return (await res.json()).countryName;
            } catch (e) {}

            // Timezone fallback
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            if (tz.includes("Karachi")) return "Pakistan";
            if (tz.includes("Kolkata") || tz.includes("Calcutta")) return "India";
            if (tz.includes("London")) return "United Kingdom";
            if (tz.includes("New_York") || tz.includes("Los_Angeles")) return "United States";
            if (tz.includes("Dubai")) return "United Arab Emirates";
            if (tz.includes("Riyadh")) return "Saudi Arabia";
            if (tz.includes("Toronto") || tz.includes("Vancouver")) return "Canada";
            if (tz.includes("Sydney") || tz.includes("Melbourne")) return "Australia";
            return null;
          };

          userCountryName = await getGeo();
        } catch (err) {
          console.warn("Geo-location failed, using default.");
        }

        if (userCountryName) {
          const userIndex = countriesData.findIndex(
            (c) =>
              c.name.common.toLowerCase() === userCountryName.toLowerCase(),
          );
          if (userIndex > -1) {
            const userCountryObj = countriesData.splice(userIndex, 1)[0];
            countriesData.unshift(userCountryObj);
            setFormData((prev) => ({
              ...prev,
              country: userCountryObj.name.common,
            })); // Auto-select
          }
        }

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

        setCountries(sortedCountries);
      } catch (error) {
        console.error("Failed to load countries:", error);
      }
    };
    loadCountries();
  }, []);

  // ==========================================
  // FETCH SUPABASE SHIPPING OPTIONS
  // ==========================================
  useEffect(() => {
    const fetchShipping = async () => {
      if (!window.supabase) return;
      try {
        const { data, error } = await window.supabase
          .from("delivery_options")
          .select("*")
          .order("cost", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setShippingOptions(data);
          setSelectedShippingCost(parseFloat(data[0].cost));
          setSelectedShippingTitle(data[0].name);
        }
      } catch (err) {
        console.error("Failed to load shipping options:", err);
      }
    };

    if (window.supabase) fetchShipping();
    else window.addEventListener("supabaseInitialized", fetchShipping);
    return () =>
      window.removeEventListener("supabaseInitialized", fetchShipping);
  }, []);

  // ==========================================
  // COUPON / DISCOUNT SYNC (Reactive)
  // ==========================================
  useEffect(() => {
    // 1. Initial Load from LocalStorage
    if (!appliedOffer) {
      const savedOfferStr = localStorage.getItem("strideAppliedOffer");
      if (savedOfferStr) {
        try {
          setAppliedOffer(JSON.parse(savedOfferStr));
        } catch (e) {}
      }
    }

    // 2. Setup Event Listener for NEW coupons
    const handleCouponApplied = (e) => {
      const offer = e.detail.offer;
      setAppliedOffer(offer);
      localStorage.setItem("strideAppliedOffer", JSON.stringify(offer));
    };

    window.addEventListener("couponApplied", handleCouponApplied);
    return () => window.removeEventListener("couponApplied", handleCouponApplied);
  }, []);

  // 3. Reactive Discount Calculation
  useEffect(() => {
    if (!appliedOffer || cartItems.length === 0) {
      if (discount !== 0) {
        setDiscount(0);
        localStorage.setItem("strideDiscount", "0");
      }
      return;
    }

    let calculatedDiscount = 0;

    if (appliedOffer.type === "coupon") {
      // OVERALL COUPON: Find most expensive product and apply percentage to it
      let mostExpensiveItem = cartItems[0];
      cartItems.forEach(item => {
        if (item.price > mostExpensiveItem.price) {
          mostExpensiveItem = item;
        }
      });
      
      // Apply percentage to ONE unit of the most expensive item
      calculatedDiscount = mostExpensiveItem.price * (appliedOffer.discount_percentage / 100);
    } 
    else if (appliedOffer.type === "product") {
      // SPECIFIC PRODUCT COUPON
      const targetItem = cartItems.find(item => item.id === appliedOffer.target_product_id);
      
      if (!targetItem) {
        // Product removed from cart -> KILL THE COUPON
        setAppliedOffer(null);
        localStorage.removeItem("strideAppliedOffer");
        setDiscount(0);
        localStorage.setItem("strideDiscount", "0");
        if (window.showToast) window.showToast("Coupon removed: linked product is no longer in cart.", "info");
        return;
      }

      // Apply to all units of that specific product
      calculatedDiscount = (targetItem.price * targetItem.quantity) * (appliedOffer.discount_percentage / 100);
    }

    if (Math.abs(discount - calculatedDiscount) > 0.01) {
      setDiscount(calculatedDiscount);
      localStorage.setItem("strideDiscount", calculatedDiscount.toString());
    }
  }, [cartItems, appliedOffer, setDiscount]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id.replace("chk-", "")]: e.target.value,
    });
  };

  const goToStep = (stepNumber) => {
    setStep(stepNumber);
    if (flowRef.current) {
      const offsetTop =
        flowRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      if (window.showToast)
        window.showToast(
          "Your cart is empty! Please add items to continue.",
          "error",
        );
      return;
    }
    if (!formData.country) {
      setCountryError(true);
      return;
    }
    setCountryError(false);
    localStorage.setItem("strideCheckoutData", JSON.stringify(formData));
    goToStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      if (window.showToast)
        window.showToast(
          "Your cart is empty! Please add items to continue.",
          "error",
        );
      return;
    }
    
    // Testing Lab Override
    const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
    if (testConfig.skipStripeRedirect) {
      if (window.showToast) window.showToast("Stripe Redirect Skipped (Testing Lab Mode)", "info");
      setStep(3); // Go to step 3 but don't call initiateStripeCheckout
      setIsProcessingPayment(false);
      return;
    }

    goToStep(3);
    initiateStripeCheckout();
  };

  // ==========================================
  // STRIPE PAYMENT INTEGRATION
  // ==========================================
  const initiateStripeCheckout = async () => {
    setIsProcessingPayment(true);

    // Find the item that gets the discount for Stripe
    let discountTargetId = null;
    let mostExpensiveId = null;
    
    if (appliedOffer) {
      if (appliedOffer.type === "coupon") {
        let maxPrice = -1;
        cartItems.forEach(item => {
          if (item.price > maxPrice) {
            maxPrice = item.price;
            mostExpensiveId = item.id;
          }
        });
        discountTargetId = mostExpensiveId;
      } else if (appliedOffer.type === "product") {
        discountTargetId = appliedOffer.target_product_id;
      }
    }

    const checkoutItems = cartItems.map((item) => {
      let finalPrice = item.price;
      if (appliedOffer && item.id === discountTargetId) {
        // If it's an overall coupon, only apply discount to ONE unit in the line item total
        // But Stripe expects price per unit. To keep it simple, we'll apply the discount proportion
        // or just subtract from the unit price. 
        // User said "subtracts the percentage amount from that product".
        finalPrice = item.price - (item.price * (appliedOffer.discount_percentage / 100));
      }
      return { ...item, price: Math.max(0, finalPrice) };
    });

    try {
      const response = await fetch(
        "http://localhost:5000/api/payments/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: checkoutItems,
            customerEmail: formData.email,
          }),
        },
      );

      const session = await response.json();
      if (!response.ok)
        throw new Error(session.error || "Failed to create payment session");

      if (!window.Stripe) {
        throw new Error("Stripe script not loaded yet. Please try again in a moment.");
      }
      const stripe = window.Stripe(window.stripePublishableKey);
      const result = await stripe.redirectToCheckout({ sessionId: session.id });

      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      if (window.showToast)
        window.showToast("Payment Error: " + error.message, "error");
      setIsProcessingPayment(false);
      goToStep(2);
    }
  };

  // Click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <main className={styles["checkout-page"]}>
      <div className={`container ${styles.container}`}>
        <div className={styles["checkout-layout"]}>
          {/* LEFT COLUMN: FLOW */}
          <div className={styles["checkout-flow"]} ref={flowRef}>
            <div className={styles["progress-tracker"]}>
              <div
                className={`${styles.step} ${step >= 1 ? (step === 1 ? styles["step-active"] : styles["step-completed"]) : ""}`}
              >
                <div className={styles["step-icon"]}>1</div>
                <span className={styles["step-label"]}>Information</span>
              </div>
              <div
                className={`${styles["progress-line"]} ${step >= 2 ? styles.completed : ""}`}
              ></div>

              <div
                className={`${styles.step} ${step >= 2 ? (step === 2 ? styles["step-active"] : styles["step-completed"]) : ""}`}
              >
                <div className={styles["step-icon"]}>2</div>
                <span className={styles["step-label"]}>Shipping</span>
              </div>
              <div
                className={`${styles["progress-line"]} ${step >= 3 ? styles.completed : ""}`}
              ></div>

              <div
                className={`${styles.step} ${step === 3 ? styles["step-active"] : ""}`}
              >
                <div className={styles["step-icon"]}>3</div>
                <span className={styles["step-label"]}>Payment</span>
              </div>
            </div>

            {/* STEP 1: INFO */}
            {step === 1 && (
              <div className={styles["checkout-step"]}>
                <div className={styles["step-header"]}>
                  <h2>Contact Information</h2>
                  <p>
                    Already have an account?{" "}
                    <Link to="/login" className={styles["text-link"]}>
                      Log in
                    </Link>
                  </p>
                </div>
                <form
                  className={styles["checkout-form"]}
                  onSubmit={handleStep1Submit}
                >
                  <div
                    className={`${styles["form-group"]} ${styles["full-width"]}`}
                  >
                    <input
                      type="email"
                      id="chk-email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div
                    className={`${styles["form-group"]} ${styles["full-width"]} ${styles["mt-3"]}`}
                  >
                    <h2>Shipping Address</h2>
                  </div>

                  <div
                    className={`${styles["form-group"]} ${styles["full-width"]}`}
                  >
                    <div
                      className={`${styles["custom-select-wrapper"]} ${isDropdownOpen ? styles.dropdownActive : ""}`}
                      ref={dropdownRef}
                    >
                      <div
                        className={`${styles["custom-select-display"]} ${formData.country ? styles["has-value"] : ""}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ borderColor: countryError ? "#ef4444" : "" }}
                      >
                        <span className={styles["text-placeholder"]}>
                          {formData.country || "Select Country"}
                        </span>
                        <i className="bi bi-chevron-down"></i>
                      </div>

                      <div className={styles["custom-select-options"]}>
                        <input
                          type="text"
                          placeholder="Search country..."
                          className={styles["country-search-input"]}
                          value={searchCountryQuery}
                          onChange={(e) =>
                            setSearchCountryQuery(e.target.value)
                          }
                        />
                        {countries
                          .filter((c) =>
                            c.name.common
                              .toLowerCase()
                              .includes(searchCountryQuery.toLowerCase()),
                          )
                          .map((c, i) => (
                            <div
                              key={c.name.common}
                              className={`${styles["custom-select-option"]} ${formData.country === c.name.common ? styles.selected : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({
                                  ...formData,
                                  country: c.name.common,
                                });
                                setCountryError(false);
                                setIsDropdownOpen(false);
                                setSearchCountryQuery("");
                              }}
                            >
                              {i === 0 && formData.country === c.name.common ? (
                                <strong>{c.name.common}</strong>
                              ) : (
                                c.name.common
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                    {countryError && (
                      <p className={styles["error-msg"]}>
                        Please select a country.
                      </p>
                    )}
                  </div>

                  <div className={styles["form-row"]}>
                    <div className={styles["form-group"]}>
                      <input
                        type="text"
                        id="chk-fname"
                        placeholder="First name"
                        value={formData.fname}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className={styles["form-group"]}>
                      <input
                        type="text"
                        id="chk-lname"
                        placeholder="Last name"
                        value={formData.lname}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div
                    className={`${styles["form-group"]} ${styles["full-width"]}`}
                  >
                    <input
                      type="text"
                      id="chk-address"
                      placeholder="Address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div
                    className={`${styles["form-group"]} ${styles["full-width"]}`}
                  >
                    <input
                      type="text"
                      id="chk-apartment"
                      placeholder="Apartment, suite, etc. (optional)"
                      value={formData.apartment}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles["form-row"]}>
                    <div className={styles["form-group"]}>
                      <input
                        type="text"
                        id="chk-city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className={styles["form-group"]}>
                      <input
                        type="text"
                        id="chk-postal"
                        placeholder="Postal code"
                        value={formData.postal}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles["form-actions"]}>
                    <Link to="/cart" className={styles["back-link"]}>
                      <i className="bi bi-chevron-left"></i> Return to cart
                    </Link>
                    <button
                      type="submit"
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                    >
                      Continue to Shipping
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: SHIPPING */}
            {step === 2 && (
              <div className={styles["checkout-step"]}>
                <div className={styles["summary-box"]}>
                  <div className={styles["summary-row"]}>
                    <span className={styles["summary-label"]}>Contact</span>
                    <span className={styles["summary-value"]}>
                      {formData.email}
                    </span>
                    <button
                      type="button"
                      className={styles["edit-btn"]}
                      onClick={() => goToStep(1)}
                    >
                      Change
                    </button>
                  </div>
                  <div className={styles["summary-divider"]}></div>
                  <div className={styles["summary-row"]}>
                    <span className={styles["summary-label"]}>Ship to</span>
                    <span
                      className={styles["summary-value"]}
                    >{`${formData.address}, ${formData.city}, ${formData.country}`}</span>
                    <button
                      type="button"
                      className={styles["edit-btn"]}
                      onClick={() => goToStep(1)}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className={`${styles["step-header"]} ${styles["mt-4"]}`}>
                  <h2>Shipping Method</h2>
                </div>
                <form
                  className={styles["checkout-form"]}
                  onSubmit={handleStep2Submit}
                >
                  <div className={styles["shipping-methods"]}>
                    {shippingOptions.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: "var(--color-muted-fg)",
                          padding: "1rem",
                        }}
                      >
                        Loading shipping options...
                      </div>
                    ) : (
                      shippingOptions.map((opt) => (
                        <label
                          key={opt.id}
                          className={styles["shipping-option"]}
                        >
                          <div className={styles["shipping-left"]}>
                            <input
                              type="radio"
                              name="shipping-rate"
                              value={opt.cost}
                              checked={
                                selectedShippingCost === parseFloat(opt.cost)
                              }
                              onChange={() => {
                                setSelectedShippingCost(parseFloat(opt.cost));
                                setSelectedShippingTitle(opt.name);
                              }}
                            />
                            <div className={styles["shipping-info"]}>
                              <span className={styles["shipping-title"]}>
                                {opt.name}
                              </span>
                              <span className={styles["shipping-desc"]}>
                                {opt.estimated_time}
                              </span>
                            </div>
                          </div>
                          <span className={styles["shipping-price"]}>
                            {parseFloat(opt.cost) === 0
                              ? "Free"
                              : window.formatPrice
                                ? window.formatPrice(opt.cost)
                                : `$${parseFloat(opt.cost).toFixed(2)}`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div
                    className={`${styles["form-actions"]} ${styles["mt-4"]}`}
                  >
                    <button
                      type="button"
                      className={styles["back-link"]}
                      onClick={() => goToStep(1)}
                    >
                      <i className="bi bi-chevron-left"></i> Return to
                      information
                    </button>
                    <button
                      type="submit"
                      className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-large"]}`}
                    >
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: PAYMENT LOADER */}
            {step === 3 && (
              <div className={styles["checkout-step"]}>
                <div className={styles["summary-box"]}>
                  <div className={styles["summary-row"]}>
                    <span className={styles["summary-label"]}>Contact</span>
                    <span className={styles["summary-value"]}>
                      {formData.email}
                    </span>
                    <button
                      type="button"
                      className={styles["edit-btn"]}
                      onClick={() => goToStep(1)}
                    >
                      Change
                    </button>
                  </div>
                  <div className={styles["summary-divider"]}></div>
                  <div className={styles["summary-row"]}>
                    <span className={styles["summary-label"]}>Ship to</span>
                    <span
                      className={styles["summary-value"]}
                    >{`${formData.address}, ${formData.city}, ${formData.country}`}</span>
                    <button
                      type="button"
                      className={styles["edit-btn"]}
                      onClick={() => goToStep(1)}
                    >
                      Change
                    </button>
                  </div>
                  <div className={styles["summary-divider"]}></div>
                  <div className={styles["summary-row"]}>
                    <span className={styles["summary-label"]}>Method</span>
                    <span className={styles["summary-value"]}>
                      {selectedShippingTitle} -{" "}
                      {selectedShippingCost === 0
                        ? "Free"
                        : window.formatPrice
                          ? window.formatPrice(selectedShippingCost)
                          : `$${selectedShippingCost.toFixed(2)}`}
                    </span>
                    <button
                      type="button"
                      className={styles["edit-btn"]}
                      onClick={() => goToStep(2)}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className={styles["payment-loader"]}>
                  {(() => {
                    const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
                    if (testConfig.skipStripeRedirect) {
                      return (
                        <>
                          <div className={`${styles.spinner} ${styles.paused}`} style={{ borderTopColor: "var(--color-muted-fg)", animation: "none" }}></div>
                          <h2>Stripe Checkout Disabled</h2>
                          <p style={{ color: "var(--color-muted-fg)", marginBottom: "1.5rem" }}>
                            Testing Lab Mode: Stride has been disabled. The process stops before payment.
                          </p>
                          <Link to="/" className={styles["btn-outline"]} style={{ textDecoration: "none" }}>Return to Home</Link>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className={styles.spinner}></div>
                        <h2>Redirecting to Secure Payment...</h2>
                        <p style={{ color: "var(--color-muted-fg)" }}>
                          Please do not close or refresh this window.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SUMMARY */}
          <div className={styles["checkout-summary"]}>
            <div className={styles["summary-card"]}>
              <h3 className={styles["summary-title"]}>Your Order</h3>

              <div className={styles["order-items"]}>
                {cartItems.length === 0 ? (
                  <p
                    style={{
                      color: "var(--color-muted-fg)",
                      textAlign: "center",
                      padding: "1rem 0",
                    }}
                  >
                    Your cart is empty.
                  </p>
                ) : (
                  cartItems.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className={styles["order-item"]}
                    >
                      <div className={styles["item-img-wrapper"]}>
                        <img src={item.img} alt={item.name} />
                        <span className={styles["item-badge"]}>
                          {item.quantity}
                        </span>
                      </div>
                      <div className={styles["item-info"]}>
                        <span className={styles["item-name"]}>{item.name}</span>
                        <span className={styles["item-brand"]}>
                          {item.brand}
                        </span>
                      </div>
                      <div className={styles["item-price-wrapper"]}>
                        {discountedItemId === item.id && appliedOffer && (
                          <span className={styles["old-price"]}>
                            {window.formatPrice
                              ? window.formatPrice(item.price * item.quantity)
                              : `$${(item.price * item.quantity).toFixed(2)}`}
                          </span>
                        )}
                        <span className={`${styles["item-price"]} ${discountedItemId === item.id ? styles["discounted-price"] : ""}`}>
                          {window.formatPrice
                            ? window.formatPrice(
                                (item.price * item.quantity) - 
                                (discountedItemId === item.id ? (item.price * item.quantity * (appliedOffer.discount_percentage / 100)) : 0)
                              )
                            : `$${((item.price * item.quantity) - (discountedItemId === item.id ? (item.price * item.quantity * (appliedOffer.discount_percentage / 100)) : 0)).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={styles["coupon-section"]}>
                <Coupon />
              </div>

              <div className={styles["price-breakdown"]}>
                <div className={styles["price-row"]}>
                  <span>Subtotal</span>
                  <span>
                    {window.formatPrice
                      ? window.formatPrice(subtotal)
                      : `$${subtotal.toFixed(2)}`}
                  </span>
                </div>
                <div className={styles["price-row"]}>
                  <span>Shipping</span>
                  <span>
                    {selectedShippingCost === 0
                      ? "Free"
                      : window.formatPrice
                        ? window.formatPrice(selectedShippingCost)
                        : `$${selectedShippingCost.toFixed(2)}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div
                    className={`${styles["price-row"]} ${styles["text-accent"]}`}
                  >
                    <span>Discount</span>
                    <span>
                      -
                      {window.formatPrice
                        ? window.formatPrice(discount)
                        : `$${discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles["total-row"]}>
                <span>Total</span>
                <span className={styles["total-price"]}>
                  {window.formatPrice
                    ? window.formatPrice(finalTotal)
                    : `$${finalTotal.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
