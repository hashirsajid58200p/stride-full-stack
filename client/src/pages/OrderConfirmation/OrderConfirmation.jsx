import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import styles from "./OrderConfirmation.module.css";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { setCartItems, setDiscount } = useCart(); // Access to clear global cart

  const [orderState, setOrderState] = useState({
    id: "Unknown",
    name: "...",
    email: "...",
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    loading: true,
  });

  useEffect(() => {
    if (!sessionId) {
      setOrderState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const shortId = "ORD-" + sessionId.substring(8, 16).toUpperCase();

    const processOrder = async () => {
      const isProcessedKey = `stride_order_processed_${sessionId}`;

      // 1. Check if already processed (Prevents refresh duplication)
      if (localStorage.getItem(isProcessedKey)) {
        const savedOrder = JSON.parse(localStorage.getItem("strideLastOrder"));
        if (savedOrder) {
          setOrderState({
            id: shortId,
            name: savedOrder.customerName,
            email: savedOrder.customerEmail,
            items: savedOrder.items,
            subtotal: savedOrder.subtotal,
            discount: savedOrder.discount,
            total: savedOrder.total,
            loading: false,
          });
        } else {
          setOrderState((prev) => ({ ...prev, id: shortId, loading: false }));
        }
        return;
      }

      // 2. We need to process it. Gather local storage info.
      const currentCart = JSON.parse(localStorage.getItem("strideCart")) || [];
      const currentDiscount =
        parseFloat(localStorage.getItem("strideDiscount")) || 0;
      const checkoutData =
        JSON.parse(localStorage.getItem("strideCheckoutData")) ||
        JSON.parse(localStorage.getItem("strideGuestInfo")) ||
        {};

      let customerName = "Guest Customer";
      let customerEmail = "guest@stride.com";

      if (checkoutData.firstName || checkoutData.lastName) {
        customerName =
          `${checkoutData.firstName || ""} ${checkoutData.lastName || ""}`.trim();
      } else if (window.auth && window.auth.currentUser) {
        customerName = window.auth.currentUser.displayName || "Registered User";
      }

      if (checkoutData.email) {
        customerEmail = checkoutData.email;
      } else if (window.auth && window.auth.currentUser) {
        customerEmail = window.auth.currentUser.email;
      }

      if (currentCart.length > 0) {
        try {
          let subtotal = 0;
          let itemsCount = 0;
          currentCart.forEach((item) => {
            const qty = item.quantity || 1;
            subtotal += item.price * qty;
            itemsCount += qty;
          });
          const finalTotal = Math.max(0, subtotal - currentDiscount);

          // A. Insert into Supabase Orders
          if (window.supabase) {
            const { error: orderError } = await window.supabase
              .from("orders")
              .insert([
                {
                  full_name: customerName,
                  email: customerEmail,
                  total_amount: finalTotal,
                  items_count: itemsCount,
                  items: currentCart,
                  status: "Pending",
                  is_manual_override: false,
                },
              ]);
            if (orderError)
              console.error("Failed to insert order to DB:", orderError);

            // B. Decrement Stock Quantity
            for (const item of currentCart) {
              const { data: sizeData, error: fetchError } =
                await window.supabase
                  .from("product_sizes")
                  .select("stock_quantity")
                  .eq("product_id", item.id)
                  .eq("size", item.size)
                  .single();

              if (!fetchError && sizeData) {
                const purchasedQty = item.quantity || 1;
                const newStock = Math.max(
                  0,
                  sizeData.stock_quantity - purchasedQty,
                );
                await window.supabase
                  .from("product_sizes")
                  .update({ stock_quantity: newStock })
                  .eq("product_id", item.id)
                  .eq("size", item.size);
              }
            }
          }

          // C. Save processing flag and receipt data
          localStorage.setItem(isProcessedKey, "true");
          const orderData = {
            customerName,
            customerEmail,
            items: currentCart,
            discount: currentDiscount,
            total: finalTotal,
            subtotal,
          };
          localStorage.setItem("strideLastOrder", JSON.stringify(orderData));

          // D. Clear Storage & Global Context State
          localStorage.removeItem("strideCart");
          localStorage.removeItem("strideDiscount");
          localStorage.removeItem("strideAppliedOffer");
          localStorage.removeItem("strideCheckoutData");
          setCartItems([]);
          setDiscount(0);

          setOrderState({
            id: shortId,
            name: customerName,
            email: customerEmail,
            items: currentCart,
            subtotal,
            discount: currentDiscount,
            total: finalTotal,
            loading: false,
          });
        } catch (err) {
          console.error("Critical error completing order logic:", err);
          setOrderState((prev) => ({ ...prev, loading: false }));
        }
      } else {
        setOrderState((prev) => ({ ...prev, loading: false }));
      }
    };

    processOrder();
  }, [sessionId, setCartItems, setDiscount]);

  return (
    <main className={styles["confirmation-page-wrapper"]}>
      <div className="container">
        <div className={styles["confirmation-card"]}>
          <div className={styles["confirmation-left"]}>
            <div className={styles["success-animation"]}>
              <i className="bi bi-check-circle-fill"></i>
            </div>

            <h1 className={styles["confirmation-title"]}>
              Thank you for your purchase!
            </h1>
            <p className={styles["confirmation-subtitle"]}>
              Your order has been received and is currently being processed.
            </p>

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
                <span className={styles["detail-label"]}>Status:</span>
                <span className={styles["detail-value"]}>
                  <span
                    className={`${styles.badge} ${styles["badge-success"]}`}
                  >
                    Confirmed
                  </span>
                </span>
              </div>
            </div>

            <p className={styles["email-notice"]}>
              We'll send a confirmation email with your tracking details
              shortly.
            </p>

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
          </div>

          <div className={styles["confirmation-right"]}>
            <div className={styles["purchased-items-box"]}>
              <h3 className={styles["items-title"]}>Order Summary</h3>

              <div className={styles["items-list"]}>
                {orderState.items.length > 0 ? (
                  orderState.items.map((item, idx) => {
                    const itemTotal = item.price * (item.quantity || 1);
                    return (
                      <div key={idx} className={styles["purchased-item"]}>
                        <div className={styles["item-details"]}>
                          <div className={styles["item-img-wrapper"]}>
                            <img src={item.img} alt={item.name} />
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
                      ? "Processing..."
                      : "No recent order found."}
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
