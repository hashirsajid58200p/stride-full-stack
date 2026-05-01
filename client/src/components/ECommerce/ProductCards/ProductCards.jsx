import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./ProductCards.module.css";
import { useCurrency } from "../../../context/CurrencyContext";
import { useOffers } from "../../../context/OfferContext";

export default function ProductCards({ product, index }) {
  const { currency, rate, symbol } = useCurrency();
  const { getDiscountedPrice, getProductFlashSale } = useOffers();
  const [isWished, setIsWished] = useState(false);
  const imgRef = useRef(null);

  // ==========================================
  // LOGIC 1: Data Parsing (Badges, Datasets)
  // ==========================================
  const tagsArray = product.tags
    ? product.tags.split(",").map((t) => t.trim())
    : [];

  const categoryDataString = tagsArray
    .map((t) => t.toLowerCase().replace(/\s+/g, "-"))
    .join(" ");
  const brandDataString = product.brand
    ? product.brand.trim().toLowerCase().replace(/\s+/g, "-")
    : "";
  const sizeDataString = product.product_sizes
    ? product.product_sizes.map((s) => s.size).join(",")
    : "";

  // ==========================================
  // LOGIC 2: Rating Calculation
  // ==========================================
  let reviewCount = 0;
  let avgRating = 0;

  if (product.reviews && product.reviews.length > 0) {
    reviewCount = product.reviews.length;
    const totalRating = product.reviews.reduce(
      (sum, rev) => sum + rev.rating,
      0,
    );
    avgRating = Math.round(totalRating / reviewCount);
  }

  // ==========================================
  // LOGIC 3: Wishlist Sync & Firebase Listeners
  // ==========================================
  const checkWishlistStatus = () => {
    let wished = false;
    if (window.WishlistEngine) {
      wished = window.WishlistEngine.isSpecificWished(product.id, "Default");
    } else {
      const key =
        window.auth && window.auth.currentUser
          ? `strideWishlist_${window.auth.currentUser.uid}`
          : "strideWishlist_guest";
      const list = JSON.parse(localStorage.getItem(key)) || [];
      wished = list.some(
        (item) =>
          String(item.id).toLowerCase() ===
          String(`${product.id}|Default`).toLowerCase(),
      );
    }
    setIsWished(wished);
  };

  useEffect(() => {
    // Initial check
    checkWishlistStatus();

    // Listener 1: Global Wishlist updates
    window.addEventListener("wishlistUpdated", checkWishlistStatus);

    // Listener 3: CRITICAL FIX - Auth status changes
    const authListener = () => {
      if (window.auth && typeof window.onAuthStateChanged === "function") {
        window.onAuthStateChanged(window.auth, () => {
          checkWishlistStatus();
        });
      }
    };

    if (window.auth) {
      authListener();
    } else {
      window.addEventListener("firebaseInitialized", authListener);
    }

    return () => {
      window.removeEventListener("wishlistUpdated", checkWishlistStatus);
      window.removeEventListener("firebaseInitialized", authListener);
    };
  }, [product.id]);

  // ==========================================
  // LOGIC 4: Handle Wishlist Click
  // ==========================================
  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Admin Testing Lab Restriction
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config")) || { allowWishlist: false };
      if (!testConfig.allowWishlist) {
        if (window.showToast) window.showToast("Admin restricted: 'Allow Wishlist Action' is turned OFF in Testing Lab.", "warning");
        return;
      }
    }

    // Wait for engine to load if missing, replicating your vanilla fetch fallback
    if (!window.WishlistEngine) {
      if (window.showToast) {
        window.showToast("Initializing Wishlist Engine...", "info");
      }
      // Note: In full React, the engine will be a Context. For now, we fallback safely.
    }

    let isNowWished;
    if (window.WishlistEngine) {
      isNowWished = window.WishlistEngine.toggleFromCard(product);
    } else {
      // Manual fallback toggle if engine missing
      const key =
        window.auth && window.auth.currentUser
          ? `strideWishlist_${window.auth.currentUser.uid}`
          : "strideWishlist_guest";
      let list = JSON.parse(localStorage.getItem(key)) || [];

      const targetId = `${product.id}|Default`.toLowerCase();
      const existingIdx = list.findIndex(
        (item) => String(item.id).toLowerCase() === targetId,
      );

      if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        isNowWished = false;
      } else {
        list.push({
          id: targetId,
          product_id: product.id,
          size: "Default",
          ...product,
        });
        isNowWished = true;
      }
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event("wishlistUpdated"));
    }

    setIsWished(isNowWished);
  };

  // ==========================================
  // LOGIC 5: Redundant JS Hover (Preserved)
  // ==========================================
  const handleMouseEnter = () => {
    if (imgRef.current) imgRef.current.style.transform = "scale(1.1)";
  };

  const handleMouseLeave = () => {
    if (imgRef.current) imgRef.current.style.transform = "scale(1)";
  };

  return (
    <div
      className={styles["product-card"]}
      data-index={index}
      data-category={categoryDataString}
      data-brand={brandDataString}
      data-price={product.price}
      data-sizes={sizeDataString}
    >
      <div
        className={styles["product-image"]}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles["badge-container"]}>
          {tagsArray.map((tag, i) => {
            if (tag.toLowerCase() === "new arrival") {
              return (
                <span key={i} className={styles["badge-new"]}>
                  New Arrival
                </span>
              );
            } else if (tag.toLowerCase() === "on sale") {
              return (
                <span
                  key={i}
                  className={styles["badge-tag"]}
                  style={{ background: "#ef4444" }}
                >
                  Sale
                </span>
              );
            } else {
              return (
                <span key={i} className={styles["badge-tag"]}>
                  {tag}
                </span>
              );
            }
          })}
        </div>

        <img
          ref={imgRef}
          src={product.main_image_url}
          alt={product.name}
          loading="lazy"
        />
        <div className={styles["product-overlay"]}></div>
      </div>

      <div className={styles["product-content"]}>
        <div className={styles["product-info"]}>
          <div className={styles["product-header"]}>
            <div className={styles["name-container"]}>
              <span className={styles["product-brand"]}>{product.brand}</span>
              <h3 className={styles["product-name"]}>{product.name}</h3>
            </div>
            <button
              className={`${styles["action-btn-wishlist"]} ${isWished ? styles.active : ""}`}
              aria-label="Add to wishlist"
              title="Wishlist"
              onClick={handleWishlistToggle}
            >
              {isWished ? (
                <i className="bi bi-heart-fill"></i>
              ) : (
                <i className="bi bi-heart"></i>
              )}
            </button>
          </div>

          <div className={styles["product-stars"]}>
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`bi ${star <= avgRating ? "bi-star-fill" : "bi-star"}`}
              ></i>
            ))}
            <span className={styles["review-count"]}>({reviewCount})</span>
          </div>

          {getProductFlashSale(product) ? (
            <div className={styles["price-container"]}>
              <span className={styles["old-price"]}>
                {typeof window.formatPrice === "function"
                  ? window.formatPrice(product.price)
                  : `$${product.price.toFixed(2)}`}
              </span>
              <span className={styles["new-price"]}>
                {typeof window.formatPrice === "function"
                  ? window.formatPrice(getDiscountedPrice(product))
                  : `$${getDiscountedPrice(product).toFixed(2)}`}
              </span>
            </div>
          ) : (
            <p className={styles["product-price"]}>
              {typeof window.formatPrice === "function"
                ? window.formatPrice(product.price)
                : `$${product.price.toFixed(2)}`}
            </p>
          )}
        </div>

        <div className={styles["product-actions"]}>
          <Link
            to={`/product-detail?id=${product.id}`}
            className={styles["action-btn-view"]}
            title="View Details"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
