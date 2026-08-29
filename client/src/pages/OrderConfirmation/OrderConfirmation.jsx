import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { getApiUrl } from "../../utils/apiConfig";
import SEO from "../../components/SEO/SEO";
import styles from "./OrderConfirmation.module.css";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { setCartItems, setDiscount } = useCart();
  const { formatPrice } = useCurrency();

  // 1. Retrieve any freshly cached checkout data from client storage
  const cachedData = (() => {
    try {
      const raw = localStorage.getItem("strideCheckoutData");
      const shippingRaw = localStorage.getItem("strideShippingFormData");
      const parsed = raw ? JSON.parse(raw) : null;
      const parsedShipping = shippingRaw ? JSON.parse(shippingRaw) : null;

      const name =
        parsed?.customerName ||
        `${parsed?.fname || parsedShipping?.fname || ""} ${parsed?.lname || parsedShipping?.lname || ""}`.trim() ||
        (window.auth && window.auth.currentUser?.displayName) ||
        "Customer";

      const email =
        parsed?.customerEmail ||
        parsed?.email ||
        parsedShipping?.email ||
        (window.auth && window.auth.currentUser?.email) ||
        "customer@stride.com";

      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const total = Number(parsed?.total || parsed?.finalTotal || parsed?.subtotal || 0);
      const subtotal = Number(parsed?.subtotal) || total;
      const discount = Number(parsed?.discount) || 0;

      if (parsed || parsedShipping) {
        return {
          customerName: name,
          customerEmail: email,
          items,
          subtotal,
          discount,
          total,
        };
      }
    } catch (e) {
      console.warn("[OrderConfirmation] Error reading cached checkout data:", e);
    }
    return null;
  })();

  const shortId = sessionId
    ? "ORD-" + sessionId.substring(8, 16).toUpperCase()
    : "ORD-CONFIRMED";

  const [orderState, setOrderState] = useState(() => ({
    id: shortId,
    name: cachedData?.customerName || "Customer",
    email: cachedData?.customerEmail || "customer@stride.com",
    items: cachedData?.items || [],
    subtotal: Number(cachedData?.subtotal) || 0,
    discount: Number(cachedData?.discount) || 0,
    total: Number(cachedData?.total) || 0,
    loading: !(cachedData && cachedData.items && cachedData.items.length > 0),
    status: "Confirmed",
  }));

  useEffect(() => {
    // Immediately clear active shopping cart on confirmation
    setCartItems([]);
    setDiscount(0);
    localStorage.removeItem("strideCart");
    localStorage.removeItem("strideDiscount");
    localStorage.removeItem("strideAppliedOffer");
    localStorage.removeItem("strideGuestInfo");

    if (!sessionId) {
      setOrderState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 8;

    const fetchServerOrder = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/payments/session/${sessionId}`));
        const data = await response.json();

        if (response.ok && data.paid && data.order) {
          const dbOrder = data.order;
          if (isMounted) {
            const rawItems = Array.isArray(dbOrder.items) && dbOrder.items.length > 0
              ? dbOrder.items
              : (cachedData?.items || []);
            
            const subtotal = rawItems.reduce(
              (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
              0
            );

            setOrderState({
              id: dbOrder.id ? "ORD-" + String(dbOrder.id).substring(0, 8).toUpperCase() : shortId,
              name: dbOrder.full_name || cachedData?.customerName || "Customer",
              email: dbOrder.email || cachedData?.customerEmail || "customer@stride.com",
              items: rawItems,
              subtotal: subtotal || Number(dbOrder.total_amount) || Number(cachedData?.subtotal) || 0,
              discount: Math.max(0, subtotal - Number(dbOrder.total_amount || cachedData?.total || 0)),
              total: Number(dbOrder.total_amount) || Number(cachedData?.total) || 0,
              status: dbOrder.status || "Confirmed",
              loading: false,
            });

            // Clean up temporary checkout cache once database order is verified
            localStorage.removeItem("strideCheckoutData");
          }
          return true;
        }

        // If order is still being finalized, poll briefly
        if (pollCount < maxPolls) {
          pollCount++;
          setTimeout(fetchServerOrder, 1200);
        } else {
          if (isMounted) {
            setOrderState((prev) => ({
              ...prev,
              id: shortId,
              name:
                cachedData?.customerName ||
                (window.auth && window.auth.currentUser?.displayName) ||
                "Customer",
              email:
                cachedData?.customerEmail ||
                (window.auth && window.auth.currentUser?.email) ||
                "customer@stride.com",
              items: cachedData?.items || prev.items || [],
              subtotal: Number(cachedData?.subtotal) || prev.subtotal || 0,
              total: Number(cachedData?.total) || prev.total || 0,
              status: "Confirmed",
              loading: false,
            }));
          }
        }
      } catch (err) {
        console.error("[OrderConfirmation] Error verifying order session:", err);
        if (isMounted) {
          setOrderState((prev) => ({ ...prev, id: shortId, loading: false }));
        }
      }
    };

    fetchServerOrder();

    return () => {
      isMounted = false;
    };
  }, [sessionId, setCartItems, setDiscount]);

  return (
    <main className={styles["confirmation-page-wrapper"]}>
      <SEO
        title="Order Confirmation"
        description="Your Stride order confirmation and summary."
        noindex={true}
      />
      <div className="container">
        <div className={styles["confirmation-card"]}>
          {/* HEADER: Thank you + subtitle */}
          <div className={styles["confirmation-header"]}>
            <div className={styles["success-animation"]}>
              <i className="bi bi-check-circle-fill"></i>
            </div>

            <h1 className={styles["confirmation-title"]}>
              Thank you for your purchase!
            </h1>
            <p className={styles["confirmation-subtitle"]}>
              Your order has been verified and is currently being processed.
            </p>
          </div>

          {/* LEFT: Customer & Order Details */}
          <div className={styles["confirmation-left"]}>
            <div className={styles["order-details-box"]}>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Order Number:</span>
                <span
                  className={`${styles["detail-value"]} ${styles["text-accent"]}`}
                >
                  {orderState.id}
                </span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Customer Name:</span>
                <span
                  className={styles["detail-value"]}
                  style={{ fontSize: "0.95rem" }}
                >
                  {orderState.loading ? "Loading..." : orderState.name}
                </span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Email:</span>
                <span
                  className={styles["detail-value"]}
                  style={{ fontSize: "0.85rem" }}
                >
                  {orderState.loading ? "Loading..." : orderState.email}
                </span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Payment & Status:</span>
                <span className={styles["detail-value"]}>
                  <span
                    className={`${styles.badge} ${styles["badge-success"]}`}
                  >
                    {orderState.status}
                  </span>
                </span>
              </div>
            </div>

            <p className={styles["email-notice"]}>
              We'll send a confirmation email with your tracking details
              shortly.
            </p>
          </div>

          {/* ACTIONS: Navigation buttons */}
          <div className={styles["confirmation-actions"]}>
            <Link
              to="/user-dashboard?view=orders"
              className={`${styles.btn} ${styles["btn-primary"]}`}
            >
              View My Orders
            </Link>
            <Link
              to="/products"
              className={`${styles.btn} ${styles["btn-outline"]}`}
            >
              Continue Shopping
            </Link>
          </div>

          {/* RIGHT: Purchased Items & Totals */}
          <div className={styles["confirmation-right"]}>
            <div className={styles["purchased-items-box"]}>
              <h3 className={styles["items-title"]}>Order Summary</h3>

              <div className={styles["items-list"]}>
                {orderState.loading ? (
                  <div style={{ padding: "1.5rem 0", color: "var(--color-muted-fg)", textAlign: "center" }}>
                    <i className="bi bi-arrow-repeat spin" style={{ display: "inline-block", marginRight: "0.5rem" }}></i>
                    Verifying payment details with Stripe...
                  </div>
                ) : orderState.items.length > 0 ? (
                  orderState.items.map((item, idx) => {
                    const itemTotal = (Number(item.price) || 0) * (item.quantity || 1);
                    return (
                      <div key={idx} className={styles["purchased-item"]}>
                        <div className={styles["item-details"]}>
                          <div className={styles["item-img-wrapper"]}>
                            <img src={item.img || "/images/placeholders/shoe_placeholder.png"} alt={item.name} />
                            <span className={styles["item-badge"]}>
                              {item.quantity || 1}
                            </span>
                          </div>
                          <div className={styles["item-text"]}>
                            <span className={styles["item-name"]}>
                              {item.name}
                            </span>
                            <span className={styles["item-meta"]}>
                              Size: {item.size || "Standard"} | Color:{" "}
                              {item.color || "Default"}
                            </span>
                          </div>
                        </div>
                        <span className={styles["item-price"]}>
                          {formatPrice ? formatPrice(itemTotal) : `$${itemTotal.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "var(--color-muted-fg)" }}>
                    Order confirmed.
                  </p>
                )}
              </div>

              <div className={styles["order-totals"]}>
                <div className={styles["total-row"]}>
                  <span className={styles["total-label"]}>Subtotal</span>
                  <span className={styles["total-value"]}>
                    {orderState.loading ? "..." : formatPrice ? formatPrice(orderState.subtotal) : `$${orderState.subtotal.toFixed(2)}`}
                  </span>
                </div>
                {orderState.discount > 0 && (
                  <div
                    className={`${styles["total-row"]} ${styles["text-accent"]}`}
                  >
                    <span className={styles["total-label"]}>Discount</span>
                    <span className={styles["total-value"]}>
                      -
                      {formatPrice ? formatPrice(orderState.discount) : `$${orderState.discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div
                  className={`${styles["total-row"]} ${styles["final-total"]}`}
                >
                  <span className={styles["total-label"]}>Total Paid</span>
                  <span className={styles["total-value"]}>
                    {orderState.loading ? "..." : formatPrice ? formatPrice(orderState.total) : `$${orderState.total.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
