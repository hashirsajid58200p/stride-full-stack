import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Wishlist.module.css";

// ==========================================
// THE GLOBAL WISHLIST ENGINE (Centralized Brain)
// ==========================================
if (typeof window !== "undefined" && !window.WishlistEngine) {
  window.WishlistEngine = {
    getKey: function () {
      return window.auth && window.auth.currentUser
        ? `strideWishlist_${window.auth.currentUser.uid}`
        : "strideWishlist_guest";
    },
    get: function () {
      return JSON.parse(localStorage.getItem(this.getKey())) || [];
    },
    save: function (list, triggerEvent = true) {
      localStorage.setItem(this.getKey(), JSON.stringify(list));
      if (triggerEvent) {
        window.dispatchEvent(new Event("wishlistUpdated"));
      }
    },
    normalizeColor: function (color) {
      if (
        color === undefined ||
        color === null ||
        String(color).trim() === "" ||
        String(color).trim().toLowerCase() === "standard"
      ) {
        return "Default";
      }
      let c = String(color).trim();
      if (c.toLowerCase() === "default") return "Default";
      return c;
    },
    generateId: function (productId, color) {
      return `${productId}|${this.normalizeColor(color)}`;
    },
    isSpecificWished: function (productId, color) {
      const compId = this.generateId(productId, color);
      return this.get().some(
        (item) =>
          String(item.id).toLowerCase() === String(compId).toLowerCase(),
      );
    },
    toggleFromCard: function (product) {
      const userRole = localStorage.getItem("userRole");
      if (!userRole && (!window.auth || !window.auth.currentUser)) {
        window.location.href = "/login"; // Redirect in React environment
        return false;
      }
      let list = this.get();
      const compId = this.generateId(product.id, "Default");
      const index = list.findIndex(
        (item) =>
          String(item.id).toLowerCase() === String(compId).toLowerCase(),
      );
      let isNowWished = false;
      if (index > -1) {
        list.splice(index, 1);
        if (window.showToast) window.showToast("Removed from wishlist");
      } else {
        list.push({
          id: compId,
          productId: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          img: product.main_image_url || product.img,
          color: "Default",
        });
        isNowWished = true;
        if (window.showToast)
          window.showToast(`${product.name} added to wishlist!`, "success");
      }
      this.save(list);
      return isNowWished;
    },
    toggleSpecific: function (product, color, img) {
      const userRole = localStorage.getItem("userRole");
      if (!userRole && (!window.auth || !window.auth.currentUser)) {
        window.location.href = "/login";
        return false;
      }
      let list = this.get();
      const safeColor = this.normalizeColor(color);
      const compId = this.generateId(product.id, safeColor);
      const index = list.findIndex(
        (item) =>
          String(item.id).toLowerCase() === String(compId).toLowerCase(),
      );
      let isNowWished = false;
      if (index > -1) {
        list.splice(index, 1);
        if (window.showToast) window.showToast("Removed from wishlist");
      } else {
        list.push({
          id: compId,
          productId: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          img: img || product.main_image_url || product.img,
          color: safeColor,
        });
        isNowWished = true;
        let cName = safeColor !== "Default" ? ` (${safeColor})` : "";
        if (window.showToast)
          window.showToast(
            `${product.name}${cName} added to wishlist!`,
            "success",
          );
      }
      this.save(list);
      return isNowWished;
    },
  };
}

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const loadWishlist = () => {
    const userRole = localStorage.getItem("userRole");
    const hasAuth = userRole || (window.auth && window.auth.currentUser);

    setIsLoggedIn(!!hasAuth);

    if (hasAuth && window.WishlistEngine) {
      setWishlistItems(window.WishlistEngine.get());
    } else {
      setWishlistItems([]);
    }
  };

  useEffect(() => {
    // Initial Load
    loadWishlist();

    // Listener for when an item is added/removed elsewhere (e.g. ProductCards)
    const handleUpdate = () => loadWishlist();
    window.addEventListener("wishlistUpdated", handleUpdate);

    // Listener for Auth changes
    const authListener = () => loadWishlist();
    if (window.auth && typeof window.onAuthStateChanged === "function") {
      window.onAuthStateChanged(window.auth, authListener);
    }
    window.addEventListener("firebaseInitialized", authListener);

    return () => {
      window.removeEventListener("wishlistUpdated", handleUpdate);
      window.removeEventListener("firebaseInitialized", authListener);
    };
  }, []);

  const handleRemove = (idToRemove) => {
    if (!window.WishlistEngine) return;
    let currentList = window.WishlistEngine.get();
    currentList = currentList.filter((item) => item.id !== idToRemove);
    window.WishlistEngine.save(currentList);
    if (window.showToast) window.showToast("Item removed from wishlist");
  };

  return (
    <div className={styles["wishlist-component"]}>
      <div className={styles["wishlist-header"]}>
        <h2 className={styles["wishlist-title"]}>My Wishlist</h2>
        <p className={styles["wishlist-subtitle"]}>
          Items you've saved for later.
        </p>
      </div>

      <div className={styles["wishlist-grid"]}>
        {!isLoggedIn ? (
          <div className={styles["empty-wishlist-state"]}>
            <i className="bi bi-lock-fill"></i>
            <h3>Login to view Wishlist</h3>
            <p>Please sign in to see your saved items.</p>
            <Link
              to="/login"
              className={styles["btn-primary"]}
              style={{ width: "auto", padding: "0.8rem 2rem" }}
            >
              Sign In
            </Link>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className={styles["empty-wishlist-state"]}>
            <i className="bi bi-heartbreak"></i>
            <h3>Your Wishlist is Empty</h3>
            <p>Looks like you haven't saved any favorites yet.</p>
            <Link
              to="/products"
              className={styles["btn-primary"]}
              style={{ width: "auto", padding: "0.8rem 2rem" }}
            >
              Explore Products
            </Link>
          </div>
        ) : (
          wishlistItems.map((item) => (
            <div key={item.id} className={styles["wish-card"]}>
              <button
                className={styles["wishlist-remove-icon"]}
                title="Remove"
                onClick={() => handleRemove(item.id)}
              >
                <i className="bi bi-trash"></i>
              </button>
              <div className={styles["card-img-wrapper"]}>
                <img src={item.img} alt={item.name} />
              </div>
              <div className={styles["card-main-info"]}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--color-accent)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {item.brand}
                </span>
                <h4>
                  {item.name}{" "}
                  {item.color !== "Default" && (
                    <span style={{ fontWeight: 400, fontSize: "0.8rem" }}>
                      ({item.color})
                    </span>
                  )}
                </h4>
                <span className={styles["card-price"]}>
                  {typeof window.formatPrice === "function"
                    ? window.formatPrice(item.price)
                    : `$${item.price.toFixed(2)}`}
                </span>
              </div>
              <div className={styles["wish-actions"]}>
                {/* Note: Extracted original productId from the composite ID for the URL */}
                <Link
                  to={`/product-detail?id=${item.id.split("|")[0]}`}
                  className={styles["btn-primary"]}
                >
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
