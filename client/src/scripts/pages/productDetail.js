document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainProductImage");

  // Grab elements to populate dynamically
  const titleEl = document.querySelector(".product-title");
  const brandEl = document.querySelector(".product-brand");
  const priceEl = document.querySelector(".product-price-large");
  const descEl = document.querySelector(".product-description");
  const thumbnailGrid = document.getElementById("thumbnailGrid");
  const colorGrid = document.getElementById("colorGrid");
  const sizeGrid = document.getElementById("sizeGrid");
  const colorDisplay = document.getElementById("colorNameDisplay");

  const productLayout = document.getElementById("main-product-layout");

  const relatedProductsGrid = document.getElementById("related-products-grid");

  // Keep track of current state for Cart additions
  let currentProductData = null;
  let activeColorName = "";

  // Listen for the global currency engine finishing its background load
  // If the currency engine loads after the product details, we need to update the price again!
  window.addEventListener("currencyUpdated", () => {
    if (currentProductData && priceEl) {
      priceEl.textContent = window.formatPrice(currentProductData.price);
    }
  });

  // ==========================================
  // COMPONENT LOADER: Fetch Skeleton Animation
  // ==========================================
  async function loadSkeletonComponent() {
    if (!window.renderSkeletonCardTemplate) {
      try {
        const response = await fetch("../components/skeletonAnimation.html");
        const html = await response.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });
      } catch (err) {
        console.error("Failed to load skeleton component:", err);
      }
    }
  }

  // ==========================================
  // COMPONENT LOADER: Fetch Product Cards
  // ==========================================
  async function loadProductCardsComponent() {
    if (!window.renderProductCardTemplate) {
      try {
        const response = await fetch("../components/productCards.html");
        const html = await response.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });
      } catch (err) {
        console.error("Failed to load productCards component:", err);
      }
    }
  }

  // ==========================================
  // COMPONENT LOADER: Fetch Reviews Section
  // ==========================================
  async function loadReviewsComponent(productId) {
    try {
      const response = await fetch("../components/reviews.html");
      const html = await response.text();
      const placeholder = document.getElementById("reviews-placeholder");

      if (placeholder) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;

        while (wrapper.firstChild) {
          if (wrapper.firstChild.tagName !== "SCRIPT") {
            placeholder.appendChild(wrapper.firstChild);
          } else {
            const scriptNode = document.createElement("script");
            scriptNode.textContent = wrapper.firstChild.textContent;
            document.body.appendChild(scriptNode);
            wrapper.removeChild(wrapper.firstChild);
          }
        }
        // Initialize the reviews script logic and pass the product ID!
        if (typeof window.initReviews === "function") {
          window.initReviews(productId);
        }
      }
    } catch (err) {
      console.error("Failed to load reviews component:", err);
    }
  }

  // ==========================================
  // FETCH PRODUCT FROM SUPABASE USING URL ID
  // ==========================================
  async function fetchProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
      productLayout.innerHTML = `<div style="text-align:center; padding: 4rem; grid-column: 1/-1;"><h2 style="color:var(--color-fg);">Product Not Found</h2><p style="color:var(--color-muted-fg); margin-top:1rem;">Please select a product from the shop.</p><a href="products.html" class="btn btn-primary mt-3">Back to Shop</a></div>`;
      return;
    }

    try {
      if (!window.supabase) {
        window.addEventListener("supabaseInitialized", fetchProductDetails);
        return;
      }

      await loadProductCardsComponent();
      await loadReviewsComponent(productId);

      const { data: product, error } = await window.supabase
        .from("products")
        .select(
          `
          *,
          product_colors (*),
          product_sizes (*)
        `,
        )
        .eq("id", productId)
        .single();

      if (error) throw error;

      currentProductData = product;
      renderProductDetails(product);

      fetchRelatedProducts(product.brand, product.id);
    } catch (error) {
      console.error("Error fetching product details:", error);
      productLayout.innerHTML = `<div style="text-align:center; padding: 4rem; grid-column: 1/-1; color:#ef4444;">Failed to load product data.</div>`;
    }
  }

  // ==========================================
  // RENDER DYNAMIC DATA INTO HTML
  // ==========================================
  function renderProductDetails(product) {
    document
      .getElementById("main-image-container")
      .classList.remove("skeleton-box");
    titleEl.classList.remove("skeleton-box", "skeleton-text");
    brandEl.classList.remove("skeleton-box", "skeleton-text");
    priceEl.classList.remove("skeleton-box", "skeleton-text");
    descEl.classList.remove("skeleton-box", "skeleton-text");

    document.title = `${product.name} - Premium Footwear`;
    titleEl.textContent = product.name;
    brandEl.textContent = product.brand;

    // FIX: Using window.formatPrice instead of hardcoded $
    priceEl.textContent = window.formatPrice(product.price);

    descEl.textContent = product.description;

    mainImage.style.opacity = "1";

    const allImages = [product.main_image_url];

    colorGrid.innerHTML = "";
    if (product.product_colors && product.product_colors.length > 0) {
      product.product_colors.forEach((colorObj, index) => {
        if (colorObj.image_url !== product.main_image_url) {
          allImages.push(colorObj.image_url);
        }

        const btn = document.createElement("button");
        btn.className = `color-btn ${index === 0 ? "active" : ""}`;
        btn.setAttribute("data-color", colorObj.color_name);
        btn.setAttribute("data-image", colorObj.image_url);
        btn.title = colorObj.color_name;

        if (colorObj.color_name.toLowerCase() === "default") {
          btn.classList.add("color-default");
          btn.innerHTML = `<span class="def-text">DEFAULT</span>`;
        } else if (colorObj.color_code) {
          btn.style.backgroundColor = colorObj.color_code;
        } else {
          btn.style.backgroundColor = getColorHexFallback(colorObj.color_name);
        }

        colorGrid.appendChild(btn);

        if (index === 0) {
          colorDisplay.textContent = colorObj.color_name;
          activeColorName = colorObj.color_name;
        }
      });
      attachColorListeners();
    } else {
      colorGrid.innerHTML = `<p class="text-muted">Standard Edition</p>`;
      colorDisplay.textContent = "Standard";
      activeColorName = "Standard";
    }

    thumbnailGrid.innerHTML = "";
    mainImage.src = allImages[0];

    allImages.forEach((imgUrl, index) => {
      if (index > 3) return;

      const thumb = document.createElement("button");
      thumb.className = `thumbnail ${index === 0 ? "active" : ""}`;
      thumb.setAttribute("data-image", imgUrl);
      thumb.innerHTML = `<img src="${imgUrl}" alt="View ${index + 1}" />`;
      thumbnailGrid.appendChild(thumb);
    });
    attachThumbnailListeners();

    sizeGrid.innerHTML = "";
    if (product.product_sizes && product.product_sizes.length > 0) {
      const sortedSizes = product.product_sizes.sort(
        (a, b) => parseFloat(a.size) - parseFloat(b.size),
      );

      sortedSizes.forEach((sizeObj, index) => {
        const btn = document.createElement("button");
        btn.className = `size-btn ${index === 0 ? "active" : ""}`;
        btn.setAttribute("data-size", sizeObj.size);
        btn.setAttribute("data-stock", sizeObj.stock_quantity);
        btn.textContent = sizeObj.size;

        if (sizeObj.stock_quantity <= 0) {
          btn.disabled = true;
          btn.style.opacity = "0.4";
          btn.style.cursor = "not-allowed";
          btn.title = "Out of Stock";
          if (index === 0) btn.classList.remove("active");
        }

        sizeGrid.appendChild(btn);
      });
      attachSizeListeners();
    } else {
      sizeGrid.innerHTML = `<p class="text-muted">Sold Out</p>`;
    }
  }

  // ==========================================
  // Related Products (Suggestions) Logic
  // ==========================================
  async function fetchRelatedProducts(brand, currentId) {
    try {
      await loadSkeletonComponent();
      relatedProductsGrid.innerHTML = window.renderSkeletonCardTemplate(4);

      const { data: suggestions, error } = await window.supabase
        .from("products")
        .select("*, reviews(rating)")
        .neq("id", currentId)
        .eq("brand", brand)
        .limit(4)
        .order("created_at", { ascending: false });

      if (error) throw error;

      renderRelatedProducts(suggestions);
    } catch (error) {
      console.error("Error fetching related products:", error);
      relatedProductsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color:var(--color-muted-fg); padding: 2rem;">No related products found.</div>`;
    }
  }

  function renderRelatedProducts(products) {
    relatedProductsGrid.innerHTML = "";

    if (!products || products.length === 0) {
      relatedProductsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color:var(--color-muted-fg); padding: 2rem;">No related products found.</div>`;
      return;
    }

    const cardsHTML = products
      .map((p, index) =>
        window.renderProductCardTemplate
          ? window.renderProductCardTemplate(p, index)
          : "",
      )
      .join("");

    relatedProductsGrid.innerHTML = cardsHTML;
    attachWishlistCardListeners();
  }

  function getColorHexFallback(colorStr) {
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
  }

  function attachThumbnailListeners() {
    const thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const imageSrc = thumb.getAttribute("data-image");
        mainImage.src = imageSrc;

        thumbnails.forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
      });
    });
  }

  function attachColorListeners() {
    const colorBtns = document.querySelectorAll(".color-btn");
    colorBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        colorBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const colorName = btn.getAttribute("data-color");
        const imgPath = btn.getAttribute("data-image");

        colorDisplay.textContent = colorName;
        activeColorName = colorName;

        mainImage.style.opacity = "0";
        setTimeout(() => {
          mainImage.src = imgPath;
          mainImage.style.opacity = "1";
        }, 250);
      });
    });
  }

  function attachSizeListeners() {
    const sizeButtons = document.querySelectorAll(".size-btn:not([disabled])");
    sizeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        sizeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  // Kick off dynamic fetch
  fetchProductDetails();

  // Quantity Control Logic
  let quantity = 1;
  const quantityValue = document.getElementById("quantityValue");
  const decreaseBtn = document.getElementById("decreaseQty");
  const increaseBtn = document.getElementById("increaseQty");

  if (decreaseBtn && increaseBtn) {
    decreaseBtn.addEventListener("click", () => {
      if (quantity > 1) {
        quantity--;
        quantityValue.textContent = quantity;
      }
    });

    increaseBtn.addEventListener("click", () => {
      quantity++;
      quantityValue.textContent = quantity;
    });
  }

  // Size Chart Modal Logic
  const sizeChartModal = document.getElementById("sizeChartModal");
  const openSizeChartBtn = document.getElementById("openSizeChart");
  const closeSizeChartBtn = document.getElementById("closeSizeChart");

  if (openSizeChartBtn && sizeChartModal) {
    openSizeChartBtn.addEventListener("click", () => {
      sizeChartModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });

    closeSizeChartBtn.addEventListener("click", () => {
      sizeChartModal.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  // Shared Add to Cart Function
  function processAddToCart() {
    if (!currentProductData) return false;

    const selectedSizeBtn = document.querySelector(".size-btn.active");
    if (!selectedSizeBtn) {
      if (typeof window.showToast === "function")
        window.showToast("Please select an available size", "error");
      return false;
    }

    let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
    const size = selectedSizeBtn.dataset.size;
    const productImg = document.getElementById("mainProductImage").src;

    cartItems.push({
      id: currentProductData.id,
      name: currentProductData.name,
      brand: currentProductData.brand,
      price: currentProductData.price, // Keep base price in USD
      img: productImg,
      size: size,
      color: activeColorName,
      quantity: quantity,
    });

    localStorage.setItem("strideCart", JSON.stringify(cartItems));
    window.dispatchEvent(new Event("cartUpdated"));

    return true;
  }

  // Add to Cart Logic
  const addToCartBtn = document.querySelector(".btn-add-to-cart-page");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const success = processAddToCart();

      if (success) {
        if (typeof window.showToast === "function") {
          window.showToast(`${quantity} item(s) added to cart!`);
        }
        quantity = 1;
        quantityValue.textContent = quantity;
      }
    });
  }

  // FIX: Buy Now Logic (Intercept, Add to Cart, then Redirect)
  const buyNowBtn = document.querySelector(".btn-buy-now");
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const success = processAddToCart();

      if (success) {
        window.location.href = "checkOut.html";
      }
    });
  }

  // Main Wishlist Logic for Detail Page
  const mainWishlistBtn = document.querySelector(".big-wishlist");
  if (mainWishlistBtn) {
    mainWishlistBtn.addEventListener("click", () => {
      mainWishlistBtn.classList.toggle("active");
      const icon = mainWishlistBtn.querySelector("i");
      icon.classList.toggle("bi-heart");
      icon.classList.toggle("bi-heart-fill");
      if (typeof window.showToast === "function") {
        window.showToast(
          mainWishlistBtn.classList.contains("active")
            ? "Added to wishlist!"
            : "Removed from wishlist",
        );
      }
    });
  }

  function attachWishlistCardListeners() {
    const wishlistBtns = document.querySelectorAll(".action-btn-wishlist");
    wishlistBtns.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        newBtn.classList.toggle("active");
        const icon = newBtn.querySelector("i");
        if (newBtn.classList.contains("active")) {
          icon.classList.remove("bi-heart");
          icon.classList.add("bi-heart-fill");
          if (typeof window.showToast === "function")
            window.showToast("Added to wishlist!");
        } else {
          icon.classList.remove("bi-heart-fill");
          icon.classList.add("bi-heart");
          if (typeof window.showToast === "function")
            window.showToast("Removed from wishlist");
        }
      });
    });
  }

  // ==========================================
  // GLOBAL TOAST FUNCTION
  // ==========================================
  window.showToast = function (message, type = "success") {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.style.borderLeftColor = type === "success" ? "#4CAF50" : "#f44336";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  };
});
