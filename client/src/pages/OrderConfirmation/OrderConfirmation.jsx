import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { getApiUrl } from "../../utils/apiConfig";
import styles from "./OrderConfirmation.module.css";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { setCartItems, setDiscount } = useCart();

  const [orderState, setOrderState] = useState({
    id: "Unknown",
    name: "...",
    email: "...",
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    loading: true,
    status: "Processing",
  });

  useEffect(() => {
    // 1. Immediately clear client-side cart on reaching confirmation page
    setCartItems([]);
    setDiscount(0);
    localStorage.removeItem("strideCart");
    localStorage.removeItem("strideDiscount");
    localStorage.removeItem("strideAppliedOffer");
    localStorage.removeItem("strideCheckoutData");
    localStorage.removeItem("strideGuestInfo");

    if (!sessionId) {
      setOrderState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const shortId = "ORD-" + sessionId.substring(8, 16).toUpperCase();
    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 6;

    const fetchServerOrder = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/payments/session/${sessionId}`));
        const data = await response.json();

        if (response.ok && data.paid && data.order) {
          const dbOrder = data.order;
          if (isMounted) {
            const rawItems = Array.isArray(dbOrder.items) ? dbOrder.items : [];
            const subtotal = rawItems.reduce(
              (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
              0
            );

            setOrderState({
              id: dbOrder.id ? "ORD-" + String(dbOrder.id).substring(0, 8).toUpperCase() : shortId,
              name: dbOrder.full_name || "Valued Customer",
              email: dbOrder.email || "customer@stride.com",
              items: rawItems,
              subtotal: subtotal || Number(dbOrder.total_amount) || 0,
              discount: Math.max(0, subtotal - Number(dbOrder.total_amount || 0)),
              total: Number(dbOrder.total_amount) || 0,
              status: dbOrder.status || "Confirmed",
              loading: false,
            });
          }
          return true; // Successfully resolved
        }

        // If order is still being written by webhook, poll briefly
        if (pollCount < maxPolls) {
          pollCount++;
          setTimeout(fetchServerOrder, 1500);
        } else {
          if (isMounted) {
            // Fallback display if webhook takes longer but session exists
            setOrderState((prev) => ({
              ...prev,
              id: shortId,
              name: (window.auth && window.auth.currentUser?.displayName) || "Valued Customer",
              email: (window.auth && window.auth.currentUser?.email) || "customer@stride.com",
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
                  {orderState.name}
                </span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Email:</span>
                <span
                  className={styles["detail-value"]}
                  style={{ fontSize: "0.85rem" }}
                >
                  {orderState.email}
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
                {orderState.items.length > 0 ? (
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
                          {window.formatPrice
                            ? window.formatPrice(itemTotal)
                            : `$${itemTotal.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "var(--color-muted-fg)" }}>
                    {orderState.loading
                      ? "Verifying payment with Stripe..."
                      : "Order confirmed."}
                  </p>
                )}
              </div>

              <div className={styles["order-totals"]}>
                <div className={styles["total-row"]}>
                  <span className={styles["total-label"]}>Subtotal</span>
                  <span className={styles["total-value"]}>
                    {window.formatPrice
                      ? window.formatPrice(orderState.subtotal)
                      : `$${orderState.subtotal.toFixed(2)}`}
                  </span>
                </div>
                {orderState.discount > 0 && (
                  <div
                    className={`${styles["total-row"]} ${styles["text-accent"]}`}
                  >
                    <span className={styles["total-label"]}>Discount</span>
                    <span className={styles["total-value"]}>
                      -
                      {window.formatPrice
                        ? window.formatPrice(orderState.discount)
                        : `$${orderState.discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div
                  className={`${styles["total-row"]} ${styles["final-total"]}`}
                >
                  <span className={styles["total-label"]}>Total Paid</span>
                  <span className={styles["total-value"]}>
                    {window.formatPrice
                      ? window.formatPrice(orderState.total)
                      : `$${orderState.total.toFixed(2)}`}
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
