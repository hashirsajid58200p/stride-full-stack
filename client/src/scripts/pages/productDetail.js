// Product Detail Page Logic

document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainProductImage");

  // 1. Image Gallery Thumbnail Switching
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const imageSrc = thumb.getAttribute("data-image");
      mainImage.src = imageSrc;

      thumbnails.forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  // 2. Color Selection Logic
  const colorBtns = document.querySelectorAll(".color-btn");
  const colorDisplay = document.getElementById("colorNameDisplay");

  colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update buttons
      colorBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const colorName = btn.getAttribute("data-color");
      const imgPath = btn.getAttribute("data-image");

      // Update Main Image with transition
      mainImage.style.opacity = "0";
      setTimeout(() => {
        mainImage.src = imgPath;
        mainImage.style.opacity = "1";
        colorDisplay.textContent = colorName;
      }, 250);
    });
  });

  // 3. Review Authentication & Form Logic
  const reviewArea = document.getElementById("reviewSubmissionArea");
  const userRole = localStorage.getItem("userRole");

  function loadReviewSection() {
    if (!userRole) {
      reviewArea.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
          <i class="bi bi-lock" style="font-size: 2rem; color: var(--color-accent);"></i>
          <h4 style="margin-top: 1rem;">Share your thoughts</h4>
          <p style="font-size: 0.9rem; color: var(--color-muted-fg); margin: 1rem 0;">Only registered members can write reviews for our products.</p>
          <a href="login.html" class="btn btn-primary" style="display: block; width: 100%;">Login to Review</a>
        </div>
      `;
    } else {
      reviewArea.innerHTML = `
        <form id="reviewForm" class="review-form">
          <h4>Write a Review</h4>
          <div class="stars" style="font-size: 1.5rem; margin-bottom: 0.5rem; cursor: pointer;">
            <i class="bi bi-star"></i><i class="bi bi-star"></i><i class="bi bi-star"></i><i class="bi bi-star"></i><i class="bi bi-star"></i>
          </div>
          <textarea placeholder="Tell others what you think about the fit and quality..." required></textarea>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Post Review</button>
        </form>
      `;

      const form = document.getElementById("reviewForm");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (typeof window.showToast === "function")
          window.showToast("Review submitted! Thank you for your feedback.");
        form.reset();
      });
    }
  }
  loadReviewSection();

  // 4. Size Button Selection
  const sizeButtons = document.querySelectorAll(".size-btn");
  sizeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sizeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // 5. Quantity Control Logic
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

  // 6. Size Chart Modal Logic
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

  // 7. Add to Cart Logic
  const addToCartBtn = document.querySelector(".btn-add-to-cart-page");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const selectedSize = document.querySelector(".size-btn.active");
      if (!selectedSize) {
        if (typeof window.showToast === "function")
          window.showToast("Please select a size");
        return;
      }

      let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
      const productName = document.querySelector(".product-title").textContent;
      const productPriceText = document
        .querySelector(".product-price-large")
        .textContent.replace("$", "");
      const productImg = document.getElementById("mainProductImage").src;
      const size = selectedSize.dataset.size;

      cartItems.push({
        name: productName,
        brand: document.querySelector(".product-brand").textContent,
        price: parseFloat(productPriceText),
        img: productImg,
        size: size,
        quantity: quantity,
      });

      localStorage.setItem("strideCart", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));

      if (typeof window.showToast === "function") {
        window.showToast(`${quantity} item(s) added to cart!`);
      }

      quantity = 1;
      quantityValue.textContent = quantity;
    });
  }

  // 8. Wishlist Heart Toggling (Both Detail & Related Cards)
  const mainWishlistBtn = document.querySelector(".big-wishlist");
  if (mainWishlistBtn) {
    mainWishlistBtn.addEventListener("click", () => {
      mainWishlistBtn.classList.toggle("active");
      const icon = mainWishlistBtn.querySelector("i");
      icon.classList.toggle("bi-heart");
      icon.classList.toggle("bi-heart-fill");
    });
  }

  const cardWishlistBtns = document.querySelectorAll(
    ".action-btn-wishlist-card",
  );
  cardWishlistBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      btn.classList.toggle("active");
      const icon = btn.querySelector("i");
      icon.classList.toggle("bi-heart");
      icon.classList.toggle("bi-heart-fill");
    });
  });
});
