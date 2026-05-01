import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import Coupon from "../../components/ECommerce/Coupon";
import ProductCards from "../../components/ECommerce/ProductCards";
import SkeletonAnimation from "../../components/UI/SkeletonAnimation";
import styles from "./ShoppingCart.module.css";
import { useCurrency } from "../../context/CurrencyContext";

export default function ShoppingCart() {
  const { currency, rate, symbol } = useCurrency();
  const { cartItems, setCartItems, discount, setDiscount } = useCart();
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // 1. Calculations
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0,
  );
  const finalTotal = Math.max(0, subtotal - discount);

  // 2. Handlers
  const handleQuantityChange = (index, delta) => {
    const newCart = [...cartItems];
    const newQty = (newCart[index].quantity || 1) + delta;
    if (newQty > 0) {
      newCart[index].quantity = newQty;
      setCartItems(newCart);
      localStorage.setItem("strideCart", JSON.stringify(newCart));
    }
  };

  const handleRemove = (index) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
    localStorage.setItem("strideCart", JSON.stringify(newCart));

    // Reset discount if cart is completely emptied
    if (newCart.length === 0) {
      setDiscount(0);
      localStorage.removeItem("strideDiscount");
      localStorage.removeItem("strideAppliedOffer");
      if (window.resetCouponComponent) window.resetCouponComponent();
    }
  };

  // 3. Dynamic "You May Also Like" Logic
  useEffect(() => {
    const fetchRecs = async () => {
      if (cartItems.length === 0) {
        setRecommendations([]);
        return;
      }

      setLoadingRecs(true);
      try {
        if (!window.supabase) throw new Error("Database not connected");

        // Smart logic: Recommend based on the brand of the LAST item added
        const lastBrand = cartItems[cartItems.length - 1].brand;

        const { data, error } = await window.supabase
          .from("products")
          .select("*, reviews(rating)")
          .eq("brand", lastBrand)
          .limit(10);

        if (error) throw error;

        // Filter out items already in the cart, shuffle, and pick 2
        const cartNames = cartItems.map((item) => item.name);
        const filtered = (data || []).filter(
          (p) => !cartNames.includes(p.name),
        );
        const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 2);

        setRecommendations(shuffled);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoadingRecs(false);
      }
    };

    if (window.supabase) {
      fetchRecs();
    } else {
      window.addEventListener("supabaseInitialized", fetchRecs);
      return () => window.removeEventListener("supabaseInitialized", fetchRecs);
    }
  }, [cartItems]); // Re-run if cart changes

  return (
    <main className={styles["shopping-cart-page"]}>
      <div className={styles["page-banner"]}>
        <h2>SHOPPING CART</h2>
      </div>

      <div className="container">
        {cartItems.length === 0 ? (
          <div className={styles["cart-page-empty"]}>
            <i className="bi bi-cart-x"></i>
            <h3>YOUR CART IS EMPTY.</h3>
            <p>
              Before proceed to checkout you must add some products to your
              shopping cart.
              <br />
              You will find a lot of interesting products on our "Shop" page.
            </p>
            <Link to="/products" className={styles["return-shop-btn"]}>
              RETURN TO SHOP
            </Link>
          </div>
        ) : (
          <div className={styles["cart-page-filled"]}>
            <div className={styles["cart-table-header"]}>
              <div className={styles["col-product"]}>PRODUCT</div>
              <div
                className={`${styles["col-price"]} ${styles["text-center"]}`}
              >
                PRICE
              </div>
              <div className={`${styles["col-qty"]} ${styles["text-center"]}`}>
                QUANTITY
              </div>
              <div
                className={`${styles["col-total"]} ${styles["text-center"]}`}
              >
                TOTAL
              </div>
            </div>

            <div className={styles["cart-page-items"]}>
              {cartItems.map((item, index) => {
                const itemTotal = item.price * (item.quantity || 1);
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={styles["cart-page-item"]}
                  >
                    <div className={styles["col-product-wrap"]}>
                      <img src={item.img} alt={item.name} />
                      <div className={styles["product-info"]}>
                        <p className={styles["product-brand-tag"]}>
                          {item.brand}
                        </p>
                        <h4>{item.name}</h4>
                        <p>
                          Size: <strong>{item.size || "Standard"}</strong> |
                          Color: <strong>{item.color || "Default"}</strong>
                        </p>
                        <div className={styles["product-actions"]}>
                          <button
                            onClick={() => handleRemove(index)}
                            title="Remove Item"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles["col-price-wrap"]}>
                      <span className={styles["price-current"]}>
                        {window.formatPrice
                          ? window.formatPrice(item.price)
                          : `$${item.price.toFixed(2)}`}
                      </span>
                    </div>

                    <div className={styles["col-qty-wrap"]}>
                      <div className={styles["quantity-control"]}>
                        <button
                          className={styles["qty-btn"]}
                          onClick={() => handleQuantityChange(index, -1)}
                        >
                          <i className="bi bi-dash"></i>
                        </button>
                        <span className={styles["qty-value"]}>
                          {item.quantity || 1}
                        </span>
                        <button
                          className={styles["qty-btn"]}
                          onClick={() => handleQuantityChange(index, 1)}
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    </div>

                    <div className={styles["col-total-wrap"]}>
                      {window.formatPrice
                        ? window.formatPrice(itemTotal)
                        : `$${itemTotal.toFixed(2)}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles["cart-bottom-section"]}>
              <div className={styles["cart-notes-spacer"]}>
                <Coupon />
              </div>

              <div className={styles["cart-totals"]}>
                {discount > 0 && (
                  <div className={styles["cart-discount-row"]}>
                    <span className={styles.label}>DISCOUNT:</span>
                    <span className={styles.value}>
                      -
                      {window.formatPrice
                        ? window.formatPrice(discount)
                        : `$${discount.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className={styles["subtotal-row"]}>
                  <span className={styles.label}>SUBTOTAL:</span>
                  <span className={styles.value}>
                    {window.formatPrice
                      ? window.formatPrice(finalTotal)
                      : `$${finalTotal.toFixed(2)}`}
                  </span>
                </div>

                <Link to="/checkout" className={styles["checkout-btn"]}>
                  Check Out
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Suggestions (Only shows if cart has items AND recommendations exist) */}
      {cartItems.length > 0 && (loadingRecs || recommendations.length > 0) && (
        <section className={styles["related-products-section"]}>
          <div className="container">
            <div className={styles["section-header"]}>
              <h2 className={styles["section-title"]}>You May Also Like</h2>
            </div>
            <div className={styles["featured-products-override"]}>
              {loadingRecs ? (
                <SkeletonAnimation count={2} />
              ) : (
                recommendations.map((p, i) => (
                  <ProductCards key={p.id} product={p} index={i} />
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
