import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../../context/CartContext";
import CustomScrollbar from "../../UI/CustomScrollbar";
import styles from "./Cart.module.css";

export default function Cart() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    discount,
  } = useCart();
  const [recommendations, setRecommendations] = useState([]);
  const recTrackRef = useRef(null);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const finalTotal = Math.max(0, subtotal - discount);

  // Fetch Recommendations from Supabase
  useEffect(() => {
    const fetchRecs = async () => {
      if (!window.supabase || cartItems.length === 0) return;

      const lastBrand = cartItems[cartItems.length - 1].brand;
      const { data, error } = await window.supabase
        .from("products")
        .select("*")
        .eq("brand", lastBrand)
        .limit(10);

      if (!error && data) {
        const filtered = data.filter(
          (p) => !cartItems.some((item) => item.name === p.name),
        );
        setRecommendations(
          filtered.sort(() => 0.5 - Math.random()).slice(0, 4),
        );
      }
    };

    if (isCartOpen) fetchRecs();
  }, [isCartOpen, cartItems]);

  const scrollRecs = (direction) => {
    if (recTrackRef.current) {
      const scrollAmt = recTrackRef.current.offsetWidth + 16;
      recTrackRef.current.scrollBy({
        left: direction === "next" ? scrollAmt : -scrollAmt,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <div
        className={`${styles["cart-overlay"]} ${isCartOpen ? styles.open : ""}`}
        onClick={() => setIsCartOpen(false)}
      ></div>

      <div
        className={`${styles["cart-panel"]} ${isCartOpen ? styles.open : ""}`}
      >
        <div className={styles["cart-header"]}>
          <h3 className={styles["cart-title"]}>SHOPPING CART</h3>
          <button
            className={styles["cart-close-btn"]}
            onClick={() => setIsCartOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className={styles["cart-empty-state"]}>
            <i className={`bi bi-cart-x ${styles["empty-icon"]}`}></i>
            <p>Your cart is currently empty.</p>
            <button
              className={styles["continue-shopping-btn"]}
              onClick={() => setIsCartOpen(false)}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className={styles["cart-filled-state"]}>
            <CustomScrollbar className={styles["cart-scrollbar"]}>
              <div className={styles["cart-body"]}>
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className={styles["cart-item"]}
                  >
                    <div className={styles["cart-item-image"]}>
                      <img src={item.img} alt={item.name} />
                    </div>
                    <div className={styles["cart-item-details"]}>
                      <p className={styles["item-brand"]}>{item.brand}</p>
                      <h4 className={styles["item-title"]}>{item.name}</h4>
                      <p className={styles["item-size"]}>
                        Size: {item.size || "Standard"}
                      </p>
                      <div className={styles["item-pricing"]}>
                        <span className={styles["price-discount"]}>
                          {window.formatPrice
                            ? window.formatPrice(item.price)
                            : `$${item.price}`}
                        </span>
                      </div>
                    </div>
                    <div className={styles["item-actions-wrapper"]}>
                      <div className={styles["quantity-control"]}>
                        <button
                          className={styles["qty-btn"]}
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <i className="bi bi-dash"></i>
                        </button>
                        <span className={styles["qty-value"]}>
                          {item.quantity}
                        </span>
                        <button
                          className={styles["qty-btn"]}
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                      <button
                        className={styles["action-btn"]}
                        onClick={() => removeFromCart(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}

                {recommendations.length > 0 && (
                  <div className={styles["cart-recommendations"]}>
                    <div className={styles["recommendation-header"]}>
                      <h4>You may also like</h4>
                    </div>
                    <div className={styles["rec-carousel-wrapper"]}>
                      <button
                        className={`${styles["slider-arrow"]} ${styles["left-arrow"]}`}
                        onClick={() => scrollRecs("prev")}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      <div className={styles["rec-track"]} ref={recTrackRef}>
                        {recommendations.map((p) => (
                          <div
                            key={p.id}
                            className={styles["recommendation-item"]}
                          >
                            <img src={p.main_image_url} alt={p.name} />
                            <div className={styles["rec-details"]}>
                              <p className={styles["rec-brand"]}>{p.brand}</p>
                              <p className={styles["rec-title"]}>{p.name}</p>
                              <p className={styles["rec-price"]}>
                                {window.formatPrice
                                  ? window.formatPrice(p.price)
                                  : `$${p.price}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className={`${styles["slider-arrow"]} ${styles["right-arrow"]}`}
                        onClick={() => scrollRecs("next")}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CustomScrollbar>

            <div className={styles["cart-footer"]}>
              {discount > 0 && (
                <div className={styles["cart-discount-row"]}>
                  <span>Discount:</span>
                  <span>
                    -
                    {window.formatPrice
                      ? window.formatPrice(discount)
                      : `$${discount}`}
                  </span>
                </div>
              )}
              <div className={styles["cart-subtotal"]}>
                <span>Subtotal:</span>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(finalTotal)
                    : `$${finalTotal}`}
                </span>
              </div>
              <div className={styles["cart-buttons"]}>
                <Link
                  to="/cart"
                  className={styles["cart-btn-secondary"]}
                  onClick={() => setIsCartOpen(false)}
                >
                  VIEW CART
                </Link>
                <Link
                  to="/checkout"
                  className={styles["cart-btn-primary"]}
                  onClick={() => setIsCartOpen(false)}
                >
                  CHECK OUT
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
