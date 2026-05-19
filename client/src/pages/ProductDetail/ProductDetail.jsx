import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import ProductCards from "../../components/ECommerce/ProductCards";
import Reviews from "../../components/ECommerce/Reviews";
import SkeletonAnimation from "../../components/UI/SkeletonAnimation";
import styles from "./ProductDetail.module.css";
import { useCurrency } from "../../context/CurrencyContext";
import { useOffers } from "../../context/OfferContext";

const getColorHexFallback = (colorStr) => {
  const str = colorStr.toLowerCase().replace(/\s|-/g, "");
  const shades = {
    red: "#ff0000",
    blue: "#0000ff",
    yellow: "#ffff00",
    green: "#008000",
    orange: "#ffa500",
    purple: "#800080",
    pink: "#ffc0cb",
    brown: "#a52a2a",
    black: "#000000",
    white: "#ffffff",
    gray: "#808080",
    grey: "#808080",
    maroon: "#800000",
    crimson: "#dc143c",
    scarlet: "#ff2400",
    navy: "#000080",
    navyblue: "#000080",
    skyblue: "#87ceeb",
    royalblue: "#4169e1",
    mustard: "#ffdb58",
    gold: "#ffd700",
    lemon: "#fff700",
    olive: "#808000",
    lime: "#00ff00",
    emerald: "#50c878",
    coral: "#ff7f50",
    peach: "#ffdab9",
    tangerine: "#f28500",
    violet: "#ee82ee",
    lavender: "#e6e6fa",
    magenta: "#ff00ff",
    hotpink: "#ff69b4",
    rose: "#ff007f",
    fuchsia: "#ff00ff",
    chocolate: "#d2691e",
    tan: "#d2b48c",
    beige: "#f5f5dc",
    charcoal: "#36454f",
    jetblack: "#0a0a0a",
    ivory: "#fffff0",
    offwhite: "#faf9f6",
    silver: "#c0c0c0",
    slate: "#708090",
  };
  if (shades[str]) return shades[str];
  for (const [key, hex] of Object.entries(shades)) {
    if (str.includes(key)) return hex;
  }
  return "#808080";
};

export default function ProductDetail() {
  const { currency, rate, symbol } = useCurrency();
  const { getDiscountedPrice, getProductFlashSale } = useOffers();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCartItems, setIsCartOpen } = useCart();

  const rawId = searchParams.get("id");
  const productId = rawId ? rawId.split("|")[0] : null;
  const preselectedColor =
    rawId && rawId.includes("|") ? rawId.split("|")[1] : null;

  // States
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection States
  const [activeColor, setActiveColor] = useState(null);
  const [activeSize, setActiveSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [allImages, setAllImages] = useState([]);
  const [imgOpacity, setImgOpacity] = useState(1);

  // Derived / Global States
  const [isWished, setIsWished] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Computed Rating
  let reviewCount = 0;
  let avgRating = 0;
  if (product && product.reviews && product.reviews.length > 0) {
    reviewCount = product.reviews.length;
    const totalRating = product.reviews.reduce(
      (sum, rev) => sum + rev.rating,
      0,
    );
    avgRating = Math.round(totalRating / reviewCount);
  }

  // 1. Initial Fetch
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProductData = async () => {
      try {
        if (!window.supabase) throw new Error("Database not connected.");

        const { data, error: fetchError } = await window.supabase
          .from("products")
          .select(`*, product_colors (*), product_sizes (*), reviews (rating)`)
          .eq("id", productId)
          .single();

        if (fetchError) throw fetchError;

        setProduct(data);

        // Setup Images and Colors
        let initialImage = data.main_image_url;
        let imagesArray = [data.main_image_url];
        let initialColor = {
          name: "Default",
          code: null,
          image: data.main_image_url,
        };

        if (data.product_colors && data.product_colors.length > 0) {
          const defaultColor = data.product_colors[0];
          initialColor = {
            name: defaultColor.color_name,
            code: defaultColor.color_code,
            image: defaultColor.image_url,
          };

          if (preselectedColor) {
            const found = data.product_colors.find(
              (c) => c.color_name === preselectedColor,
            );
            if (found)
              initialColor = {
                name: found.color_name,
                code: found.color_code,
                image: found.image_url,
              };
          }

          initialImage = initialColor.image;
          data.product_colors.forEach((c) => {
            if (c.image_url !== data.main_image_url)
              imagesArray.push(c.image_url);
          });
        }

        setMainImage(initialImage);
        setAllImages(imagesArray);
        setActiveColor(initialColor);

        // Setup Sizes
        if (data.product_sizes && data.product_sizes.length > 0) {
          const sorted = [...data.product_sizes].sort(
            (a, b) => parseFloat(a.size) - parseFloat(b.size),
          );
          const firstAvailable = sorted.find((s) => s.stock_quantity > 0);
          if (firstAvailable) setActiveSize(firstAvailable.size);
        }

        // Fetch Related Products Pool
        const { data: relatedPool } = await window.supabase
          .from("products")
          .select("*, reviews(rating)")
          .neq("id", data.id)
          .limit(30);

        if (relatedPool && relatedPool.length > 0) {
          try {
            const historyKey = "stride_view_history";
            const existing = localStorage.getItem(historyKey);
            const history = existing ? JSON.parse(existing) : [];

            // 1. Build User Preferences Profile from history
            const brandCounts = {};
            const categoryCounts = {};
            history.forEach((p) => {
              if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
              if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
            });
            const historyIds = new Set(history.map((p) => p.id));

            // 2. Score each candidate product in the pool
            const scoredRelated = relatedPool.map((product) => {
              let score = 0;

              // Context Match: Same Category or Same Brand as CURRENT product (primary weight)
              if (product.category && product.category === data.category) score += 6;
              if (product.brand && product.brand === data.brand) score += 6;

              // History Match: User's general brand / category interest (+1.5 points per past view)
              if (product.brand && brandCounts[product.brand]) {
                score += brandCounts[product.brand] * 1.5;
              }
              if (product.category && categoryCounts[product.category]) {
                score += categoryCounts[product.category] * 1.5;
              }

              // Price proximity to CURRENT product (max +4 points)
              if (product.price && data.price > 0) {
                const priceDiffRatio = Math.abs(product.price - data.price) / data.price;
                score += Math.max(0, 4 - priceDiffRatio * 4);
              }

              // Penalty for items already in history to encourage discovery
              if (historyIds.has(product.id)) {
                score -= 3;
              }

              // Exploration noise factor
              score += Math.random() * 0.2;

              return { product, score };
            });

            // 3. Sort by score descending and take top 4 items
            scoredRelated.sort((a, b) => b.score - a.score);
            const recommendedRelated = scoredRelated.map((sr) => sr.product).slice(0, 4);
            setRelatedProducts(recommendedRelated);
          } catch (err) {
            console.error("AI Related Products scoring failed, fallback to brand/category match:", err);
            const fallback = relatedPool
              .filter((p) => p.brand === data.brand || p.category === data.category)
              .slice(0, 4);
            setRelatedProducts(fallback.length > 0 ? fallback : relatedPool.slice(0, 4));
          }
        } else {
          setRelatedProducts([]);
        }

        // Update Document Title
        document.title = `${data.name} | Stride`;
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (window.supabase) fetchProductData();
    else {
      window.addEventListener("supabaseInitialized", fetchProductData);
      return () =>
        window.removeEventListener("supabaseInitialized", fetchProductData);
    }
  }, [productId, preselectedColor]);

  // 1.2. Track viewed product in local storage
  useEffect(() => {
    if (product && product.id) {
      try {
        const historyKey = "stride_view_history";
        const existing = localStorage.getItem(historyKey);
        let history = existing ? JSON.parse(existing) : [];
        history = history.filter((p) => p.id !== product.id);
        history.unshift({
          id: product.id,
          brand: product.brand || "",
          category: product.category || "",
          price: product.price || 0,
          name: product.name || "",
        });
        if (history.length > 15) {
          history = history.slice(0, 15);
        }
        localStorage.setItem(historyKey, JSON.stringify(history));
      } catch (err) {
        console.error("Error tracking product view:", err);
      }
    }
  }, [product]);

  // 1.5. Scroll to Reviews if Hash is present
  useEffect(() => {
    if (!loading && product) {
      if (window.location.hash === "#reviews") {
        const timer = setTimeout(() => {
          const el = document.getElementById("reviews");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 500); // 500ms allows standard components to lay out properly
        return () => clearTimeout(timer);
      }
    }
  }, [loading, product]);

  // 2. Wishlist Sync
  const checkWishlistStatus = () => {
    if (!product || !activeColor) return;
    let wished = false;
    if (window.WishlistEngine) {
      wished = window.WishlistEngine.isSpecificWished(
        product.id,
        activeColor.name,
      );
    } else {
      const key =
        window.auth && window.auth.currentUser
          ? `strideWishlist_${window.auth.currentUser.uid}`
          : "strideWishlist_guest";
      const list = JSON.parse(localStorage.getItem(key)) || [];
      const targetId =
        `${product.id}|${activeColor.name === "Default" ? "Default" : activeColor.name}`.toLowerCase();
      wished = list.some((item) => String(item.id).toLowerCase() === targetId);
    }
    setIsWished(wished);
  };

  useEffect(() => {
    checkWishlistStatus();
    window.addEventListener("wishlistUpdated", checkWishlistStatus);
    
    const authListener = () => checkWishlistStatus();
    if (window.auth && typeof window.onAuthStateChanged === "function") {
      window.onAuthStateChanged(window.auth, authListener);
    } else {
      window.addEventListener("firebaseInitialized", authListener);
    }
    return () => {
      window.removeEventListener("wishlistUpdated", checkWishlistStatus);
      window.removeEventListener("firebaseInitialized", authListener);
    };
  }, [product, activeColor]);

  // Handlers
  const handleColorChange = (colorObj) => {
    setActiveColor({
      name: colorObj.color_name,
      code: colorObj.color_code,
      image: colorObj.image_url,
    });
    setImgOpacity(0);
    setTimeout(() => {
      setMainImage(colorObj.image_url);
      setImgOpacity(1);
    }, 250);
  };

  const handleThumbnailClick = (imgUrl) => {
    setImgOpacity(0);
    setTimeout(() => {
      setMainImage(imgUrl);
      setImgOpacity(1);
    }, 250);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    const isLoggedIn =
      localStorage.getItem("userRole") ||
      (window.auth && window.auth.currentUser);
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    // Admin Testing Lab Restriction
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config")) || { allowWishlist: false };
      if (!testConfig.allowWishlist) {
        if (window.showToast) window.showToast("Admin restricted: 'Allow Wishlist Action' is turned OFF in Testing Lab.", "warning");
        return;
      }
    }

    if (window.WishlistEngine) {
      const isNowWished = window.WishlistEngine.toggleSpecific(
        product,
        activeColor.name,
        mainImage,
      );
      setIsWished(isNowWished);
    }
  };

  const processAddToCart = () => {
    if (!activeSize) {
      if (window.showToast)
        window.showToast("Please select an available size", "error");
      return false;
    }

    let cartData = JSON.parse(localStorage.getItem("strideCart")) || [];

    // Check if exactly this variant exists
    const existingIndex = cartData.findIndex(
      (item) =>
        item.id === product.id &&
        item.size === activeSize &&
        item.color === activeColor.name,
    );

    if (existingIndex > -1) {
      cartData[existingIndex].quantity += quantity;
    } else {
      cartData.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: getDiscountedPrice(product), // USE DISCOUNTED PRICE
        basePrice: product.price, // Store base price for reference
        img: mainImage,
        size: activeSize,
        color: activeColor.name,
        quantity: quantity,
      });
    }

    localStorage.setItem("strideCart", JSON.stringify(cartData));
    setCartItems(cartData); // Sync Context
    window.dispatchEvent(new Event("cartUpdated")); // Sync Legacy
    return true;
  };

  const handleAddToCart = () => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config")) || { allowAddToCart: false };
      if (!testConfig.allowAddToCart) {
        if (window.showToast) window.showToast("Admin restricted: 'Allow Add to Cart' is turned OFF in Testing Lab.", "warning");
        return;
      }
    }

    if (processAddToCart()) {
      if (window.showToast)
        window.showToast(`${quantity} item(s) added to cart!`, "success");
      setQuantity(1); // Reset
    }
  };

  const handleBuyNow = () => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin") {
      const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config")) || { allowBuyNow: false };
      if (!testConfig.allowBuyNow) {
        if (window.showToast) window.showToast("Admin restricted: 'Allow Buy Now' is turned OFF in Testing Lab.", "warning");
        return;
      }
    }

    if (processAddToCart()) {
      navigate("/checkout");
    }
  };

  // Render States
  if (!productId) {
    return (
      <main className={styles["product-page"]}>
        <div className={`container ${styles["error-state"]}`}>
          <h2>Product Not Found</h2>
          <p>Please select a valid product from the shop.</p>
          <Link
            to="/products"
            className={styles["btn-buy-now"]}
            style={{ padding: "1rem 3rem" }}
          >
            Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles["product-page"]}>
        <div className={`container ${styles["error-state"]} ${styles.fatal}`}>
          <h2>Failed to load data</h2>
          <p>There was an issue fetching the product from our servers.</p>
          <Link
            to="/products"
            className={styles["btn-buy-now"]}
            style={{ padding: "1rem 3rem" }}
          >
            Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles["product-page"]}>
      <div className="container">
        <div className={styles["product-layout"]}>
          {/* LEFT: GALLERY */}
          <div className={styles["product-gallery"]}>
            <div
              className={`${styles["main-image"]} ${loading ? styles["skeleton-box"] : ""}`}
            >
              {!loading && (
                <img
                  src={mainImage}
                  alt="Product"
                  style={{ opacity: imgOpacity }}
                />
              )}
            </div>

            <div className={styles["thumbnail-grid"]}>
              {loading ? (
                <>
                  <div
                    className={`${styles.thumbnail} ${styles["skeleton-box"]}`}
                  ></div>
                  <div
                    className={`${styles.thumbnail} ${styles["skeleton-box"]}`}
                  ></div>
                  <div
                    className={`${styles.thumbnail} ${styles["skeleton-box"]}`}
                  ></div>
                  <div
                    className={`${styles.thumbnail} ${styles["skeleton-box"]}`}
                  ></div>
                </>
              ) : (
                allImages.slice(0, 4).map((imgUrl, i) => (
                  <button
                    key={i}
                    className={`${styles.thumbnail} ${mainImage === imgUrl ? styles.active : ""}`}
                    onClick={() => handleThumbnailClick(imgUrl)}
                  >
                    <img src={imgUrl} alt={`View ${i + 1}`} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: INFO */}
          <div className={styles["product-info"]}>
            <div>
              {loading ? (
                <div
                  className={`${styles["product-brand"]} ${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                  style={{ width: "80px" }}
                ></div>
              ) : (
                <p className={styles["product-brand"]}>{product.brand}</p>
              )}

              <div className={styles["title-wishlist-row"]}>
                {loading ? (
                  <h1
                    className={`${styles["product-title"]} ${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                    style={{ width: "250px", height: "32px" }}
                  ></h1>
                ) : (
                  <h1 className={styles["product-title"]}>{product.name}</h1>
                )}

                {!loading && (
                  <button
                    className={`${styles["detail-wishlist-btn"]} ${isWished ? styles.active : ""}`}
                    aria-label="Add to wishlist"
                    onClick={handleWishlistClick}
                  >
                    <i
                      className={`bi ${isWished ? "bi-heart-fill" : "bi-heart"}`}
                    ></i>
                  </button>
                )}
              </div>

              {loading ? (
                <div
                  className={`${styles["product-rating"]} ${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                  style={{ width: "120px", height: "20px" }}
                ></div>
              ) : (
                <div className={styles["product-rating"]}>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`bi ${star <= avgRating ? "bi-star-fill" : "bi-star"}`}
                      ></i>
                    ))}
                  </div>
                  <span className={styles["review-count"]}>
                    ({reviewCount} reviews)
                  </span>
                </div>
              )}

              {loading ? (
                <p
                  className={`${styles["product-price-large"]} ${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                  style={{
                    width: "100px",
                    height: "32px",
                    marginTop: "0.5rem",
                  }}
                ></p>
              ) : getProductFlashSale(product) ? (
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
                <p className={styles["product-price-large"]}>
                  {typeof window.formatPrice === "function"
                    ? window.formatPrice(product.price)
                    : `$${product.price.toFixed(2)}`}
                </p>
              )}

              {loading ? (
                <p
                  className={`${styles["product-description"]} ${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                  style={{ width: "100%", height: "80px", marginTop: "1rem" }}
                ></p>
              ) : (
                <p className={styles["product-description"]}>
                  {product.description}
                </p>
              )}
            </div>

            {!loading && (
              <>
                {/* COLORS */}
                <div className={styles["selection-section"]}>
                  <h3>Select Color</h3>
                  <div className={styles["color-grid"]}>
                    {product.product_colors &&
                    product.product_colors.length > 0 ? (
                      product.product_colors.map((c, i) => {
                        const isDefault =
                          c.color_name.toLowerCase() === "default";
                        return (
                          <button
                            key={i}
                            className={`${styles["color-btn"]} ${isDefault ? styles["color-default"] : ""} ${activeColor?.name === c.color_name ? styles.active : ""}`}
                            style={{
                              backgroundColor: isDefault
                                ? ""
                                : c.color_code ||
                                  getColorHexFallback(c.color_name),
                            }}
                            title={c.color_name}
                            onClick={() => handleColorChange(c)}
                          >
                            {isDefault && (
                              <span className={styles["def-text"]}>
                                DEFAULT
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p style={{ color: "var(--color-muted-fg)" }}>
                        Default Edition
                      </p>
                    )}
                  </div>
                  <p className={styles["selected-label"]}>
                    Color: <span>{activeColor?.name}</span>
                  </p>
                </div>

                {/* SIZES */}
                <div className={styles["size-section"]}>
                  <div className={styles["size-header"]}>
                    <h3>Select Size</h3>
                    <button
                      className={styles["size-guide-btn"]}
                      onClick={() => setIsModalOpen(true)}
                    >
                      Size Guide
                    </button>
                  </div>
                  <div className={styles["size-grid"]}>
                    {product.product_sizes &&
                    product.product_sizes.length > 0 ? (
                      [...product.product_sizes]
                        .sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
                        .map((s, i) => (
                          <button
                            key={i}
                            className={`${styles["size-btn"]} ${activeSize === s.size ? styles.active : ""}`}
                            disabled={s.stock_quantity <= 0}
                            title={s.stock_quantity <= 0 ? "Out of Stock" : ""}
                            onClick={() => setActiveSize(s.size)}
                          >
                            {s.size}
                          </button>
                        ))
                    ) : (
                      <p style={{ color: "var(--color-muted-fg)" }}>Sold Out</p>
                    )}
                  </div>
                </div>

                {/* QUANTITY */}
                <div className={styles["quantity-section"]}>
                  <h3>Quantity</h3>
                  <div className={styles["quantity-controls"]}>
                    <button
                      className={styles["quantity-btn"]}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </button>
                    <span className={styles["quantity-value"]}>{quantity}</span>
                    <button
                      className={styles["quantity-btn"]}
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className={styles["action-buttons"]}>
                  <button
                    className={styles["btn-buy-now"]}
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </button>
                  <button
                    className={styles["btn-add-to-cart"]}
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </button>
                </div>

                <div className={styles["product-features"]}>
                  <div className={styles["feature-item"]}>
                    <i className="bi bi-truck"></i>
                    <p>Free Shipping</p>
                  </div>
                  <div className={styles["feature-item"]}>
                    <i className="bi bi-arrow-counterclockwise"></i>
                    <p>Free Returns</p>
                  </div>
                  <div className={styles["feature-item"]}>
                    <i className="bi bi-shield-check"></i>
                    <p>2 Year Warranty</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      <section className={styles["related-products-section"]}>
        <div className="container">
          <div className={styles["section-header"]}>
            <h2 className={styles["section-title"]}>You May Also Like</h2>
          </div>
          <div className={styles["featured-products-override"]}>
            {loading ? (
              <SkeletonAnimation count={4} />
            ) : relatedProducts.length > 0 ? (
              relatedProducts.map((rp, i) => (
                <ProductCards key={rp.id} product={rp} index={i} />
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "var(--color-muted-fg)",
                }}
              >
                No related products found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* REVIEWS COMPONENT */}
      {!loading && productId && <Reviews productId={productId} />}

      {/* SIZE CHART MODAL */}
      <div
        className={`${styles["modal-overlay"]} ${isModalOpen ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsModalOpen(false);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3>Size Guide</h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setIsModalOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-body"]}>
            <div className={styles["size-table-container"]}>
              <h4>Men's Shoe Size Chart</h4>
              <table className={styles["size-table"]}>
                <thead>
                  <tr>
                    <th>US</th>
                    <th>UK</th>
                    <th>EU</th>
                    <th>Length (CM)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>7</td>
                    <td>6</td>
                    <td>40</td>
                    <td>25.0 cm</td>
                  </tr>
                  <tr>
                    <td>8</td>
                    <td>7</td>
                    <td>41</td>
                    <td>26.0 cm</td>
                  </tr>
                  <tr>
                    <td>9</td>
                    <td>8</td>
                    <td>42</td>
                    <td>27.0 cm</td>
                  </tr>
                  <tr>
                    <td>10</td>
                    <td>9</td>
                    <td>43</td>
                    <td>28.0 cm</td>
                  </tr>
                  <tr>
                    <td>11</td>
                    <td>10</td>
                    <td>44</td>
                    <td>29.0 cm</td>
                  </tr>
                  <tr>
                    <td>12</td>
                    <td>11</td>
                    <td>45 – 46</td>
                    <td>30.0 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles["size-table-container"]}>
              <h4>Women's Shoe Size Chart</h4>
              <table className={styles["size-table"]}>
                <thead>
                  <tr>
                    <th>US</th>
                    <th>UK</th>
                    <th>EU</th>
                    <th>Length (CM)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>7</td>
                    <td>5</td>
                    <td>37 – 38</td>
                    <td>24.0 cm</td>
                  </tr>
                  <tr>
                    <td>8</td>
                    <td>6</td>
                    <td>38 – 39</td>
                    <td>25.0 cm</td>
                  </tr>
                  <tr>
                    <td>9</td>
                    <td>7</td>
                    <td>40</td>
                    <td>26.0 cm</td>
                  </tr>
                  <tr>
                    <td>10</td>
                    <td>8</td>
                    <td>41</td>
                    <td>27.0 cm</td>
                  </tr>
                  <tr>
                    <td>11</td>
                    <td>9</td>
                    <td>42</td>
                    <td>28.0 cm</td>
                  </tr>
                  <tr>
                    <td>12</td>
                    <td>10</td>
                    <td>43</td>
                    <td>29.0 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
