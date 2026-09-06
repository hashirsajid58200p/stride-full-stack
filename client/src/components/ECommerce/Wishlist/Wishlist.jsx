import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebaseConfig";
import { ref, set, get } from "firebase/database";
import styles from "./Wishlist.module.css";

// ==========================================
// THE GLOBAL WISHLIST ENGINE (Centralized Brain)
// ==========================================
if (typeof window !== "undefined" && !window.WishlistEngine) {
  window.WishlistEngine = {
    getKey: function () {
      const user = (window.auth && window.auth.currentUser) || auth?.currentUser;
      if (user) {
        return `strideWishlist_${user.uid}`;
      }
      return "strideWishlist_guest";
    },
    get: function () {
      const user = (window.auth && window.auth.currentUser) || auth?.currentUser;
      const key = this.getKey();
      let localItems = JSON.parse(localStorage.getItem(key)) || [];

      // If user is logged in and primary local list is empty, try email-based key
      if (localItems.length === 0 && user?.email) {
        const emailKey = `strideWishlist_${user.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        localItems = JSON.parse(localStorage.getItem(emailKey)) || [];
        if (localItems.length > 0) {
          localStorage.setItem(key, JSON.stringify(localItems));
        }
      }

      return localItems;
    },
    save: function (list, triggerEvent = true) {
      const key = this.getKey();
      localStorage.setItem(key, JSON.stringify(list));

      const user = (window.auth && window.auth.currentUser) || auth?.currentUser;
      if (user) {
        if (user.email) {
          const emailKey = `strideWishlist_${user.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          localStorage.setItem(emailKey, JSON.stringify(list));
        }
        if (db) {
          try {
            set(ref(db, `users/${user.uid}/wishlist`), list).catch(() => {});
          } catch (e) {}
        }
      }

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
      const user = (window.auth && window.auth.currentUser) || auth?.currentUser;
      if (!user) {
        if (window.showToast) {
          window.showToast("Please sign in to save items to your wishlist", "info");
        }
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
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
      const user = (window.auth && window.auth.currentUser) || auth?.currentUser;
      if (!user) {
        if (window.showToast) {
          window.showToast("Please sign in to save items to your wishlist", "info");
        }
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
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

    // Listener for Auth changes and Cloud Wishlist Sync
    const authListener = async (currentUser) => {
      const activeUser = currentUser || (window.auth && window.auth.currentUser) || auth?.currentUser;
      if (activeUser && db) {
        try {
          const snap = await get(ref(db, `users/${activeUser.uid}/wishlist`));
          if (snap.exists()) {
            const remoteList = snap.val();
            if (Array.isArray(remoteList) && remoteList.length > 0) {
              const localKey = `strideWishlist_${activeUser.uid}`;
              localStorage.setItem(localKey, JSON.stringify(remoteList));
            }
          }
        } catch (e) {}
      }
      loadWishlist();
    };

    if (window.auth && typeof window.onAuthStateChanged === "function") {
      window.onAuthStateChanged(window.auth, authListener);
    } else if (auth && typeof auth.onAuthStateChanged === "function") {
      auth.onAuthStateChanged(authListener);
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
