// client/src/scripts/pages/index.js

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // COMPONENT LOADER: Fetch Preloader (First Visit Only)
  // ==========================================
  async function loadPreloaderComponent() {
    // Check if the user has already loaded the site in this tab session
    if (sessionStorage.getItem("strideFirstLoadDone")) return;

    const placeholder = document.getElementById("loader-placeholder");
    if (!placeholder) return;

    try {
      const response = await fetch("../components/loader.html");
      const html = await response.text();
      placeholder.innerHTML = html;

      // Remove the temporary anti-flash white screen now that the
      // real video loader component is successfully injected!
      const antiFlash = document.getElementById("anti-flash-overlay");
      if (antiFlash) {
        antiFlash.remove();
      }
      // Note: We DO NOT remove the loader-scroll-lock style here.
      // The loader.html script will naturally remove it when it fades out!

      // Execute scripts from the component
      const scripts = placeholder.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });

      // Initialize the loader animation
      if (typeof window.initLoader === "function") {
        window.initLoader();
      }

      // Save to sessionStorage so it skips the loader on future page refreshes
      sessionStorage.setItem("strideFirstLoadDone", "true");
    } catch (err) {
      console.error("Failed to load preloader component:", err);
    }
  }

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
  // COMPONENT LOADER: Fetch Newsletter
  // ==========================================
  async function loadNewsletterComponent() {
    const placeholder = document.getElementById("newsletter-placeholder");
    if (!placeholder) return;

    try {
      const response = await fetch("../components/newsletter.html");
      const html = await response.text();
      placeholder.innerHTML = html;

      // Extract the data attribute and apply the image dynamically
      const bgImage = placeholder.getAttribute("data-bg");
      if (bgImage) {
        const newsletterSection = placeholder.querySelector(".newsletter");
        if (newsletterSection) {
          newsletterSection.style.backgroundImage = `url('${bgImage}')`;
        }
      }

      // Execute scripts from the component
      const scripts = placeholder.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    } catch (err) {
      console.error("Failed to load newsletter component:", err);
    }
  }

  // ==========================================
  // FETCH FEATURED PRODUCTS FROM SUPABASE
  // ==========================================
  async function fetchFeaturedProducts() {
    const grid = document.getElementById("featured-products-grid");
    if (!grid) return;

    try {
      if (!window.supabase) {
        window.addEventListener("supabaseInitialized", fetchFeaturedProducts);
        return;
      }

      // Load the skeleton component dynamically
      await loadSkeletonComponent();

      // UX OPTIMIZATION: Inject 6 Skeleton Cards immediately while loading
      grid.innerHTML = window.renderSkeletonCardTemplate(6);

      // Load component HTML/CSS/JS First
      await loadProductCardsComponent();

      // OPTIMIZATION: Fetch products, sizes, AND reviews all at once
      const { data: products, error } = await window.supabase
        .from("products")
        .select(`*, product_sizes ( size ), reviews( rating )`);

      if (error) throw error;

      if (products && products.length > 0) {
        // Shuffle array to randomize cards every time the page loads
        const shuffled = products.sort(() => 0.5 - Math.random());
        // Grab exactly 6 cards to perfectly fill two rows of 3
        const selected = shuffled.slice(0, 6);

        // Render using the component
        const cardsHTML = selected
          .map((p, index) =>
            window.renderProductCardTemplate
              ? window.renderProductCardTemplate(p, index)
              : "",
          )
          .join("");

        grid.innerHTML = cardsHTML;
        attachWishlistListeners();
      } else {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color:var(--color-muted-fg);">No products found.</div>`;
      }
    } catch (error) {
      console.error("Error fetching featured products:", error);
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color:#ef4444;">Failed to load featured products.</div>`;
    }
  }

  function attachWishlistListeners() {
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

  // Trigger fetches on load
  loadPreloaderComponent(); // NEW: Triggers the splash screen (only on first visit)
  fetchFeaturedProducts();
  loadNewsletterComponent();

  // ==========================================
  // TEXT MARQUEE OPTIMIZATION (CSS Based)
  // ==========================================
  const textContents = document.querySelectorAll(
    ".hero-marquee-content, .text-marquee-content",
  );

  textContents.forEach((content) => {
    const originalItems = Array.from(content.children);
    for (let i = 0; i < 6; i++) {
      originalItems.forEach((item) => {
        content.appendChild(item.cloneNode(true));
      });
    }
  });

  const textTracks = document.querySelectorAll(
    ".hero-marquee-track, .text-marquee-track",
  );

  textTracks.forEach((track) => {
    const content = track.children[0];
    if (content) {
      const clone = content.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
  });

  // ==========================================
  // BRAND SHOWCASE: FLAWLESS JS CIRCULAR SCROLL
  // ==========================================
  const brandRows = document.querySelectorAll(".marquee-row");

  brandRows.forEach((row) => {
    const track = row.querySelector(".marquee-track");
    const content = track.querySelector(".marquee-content");

    // Multiply items heavily so it fills even ultrawide screens multiple times over
    const originalItems = Array.from(content.children);
    for (let i = 0; i < 8; i++) {
      originalItems.forEach((item) => {
        content.appendChild(item.cloneNode(true));
      });
    }

    // Clone once to perfectly set up the mathematical loop point
    const clone = content.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);

    let isHovered = false;

    // Timeout ensures DOM has painted and scrollWidth is accurate before doing math
    setTimeout(() => {
      const halfWidth = track.scrollWidth / 2;

      // Calculate speed dynamically: equivalent to completing a 50% shift every 45 seconds at ~60 FPS
      const speedAmt = halfWidth / (200 * 60);
      const speed = row.classList.contains("reverse") ? -speedAmt : speedAmt;

      let currentScroll = row.scrollLeft;

      // Start reversed rows in the middle so they don't hit 0 immediately and snap visibly
      if (speed < 0) {
        currentScroll = halfWidth;
        row.scrollLeft = currentScroll;
      }

      row.addEventListener("mouseenter", () => (isHovered = true));
      row.addEventListener("mouseleave", () => (isHovered = false));

      // If user swipes natively, capture their scroll position to keep the math synced
      row.addEventListener("scroll", () => {
        if (isHovered) {
          currentScroll = row.scrollLeft;
        }
      });

      function autoScroll() {
        if (!isHovered) {
          currentScroll += speed;

          // The flawless infinite loop math
          if (speed > 0 && currentScroll >= halfWidth) {
            currentScroll -= halfWidth;
          } else if (speed < 0 && currentScroll <= 0) {
            currentScroll += halfWidth;
          }

          row.scrollLeft = currentScroll;
        }
        requestAnimationFrame(autoScroll);
      }

      requestAnimationFrame(autoScroll);
    }, 200);
  });

  // ==========================================
  // TESTIMONIALS CAROUSEL LOGIC
  // ==========================================
  const testimonialTrack = document.getElementById("testimonial-track");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");

  if (testimonialTrack && prevBtn && nextBtn) {
    const scrollAmount = () => {
      const card = testimonialTrack.querySelector(".testimonial-card");
      const gap = parseInt(window.getComputedStyle(testimonialTrack).gap) || 0;
      return card.offsetWidth + gap;
    };

    nextBtn.addEventListener("click", () => {
      testimonialTrack.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });

    prevBtn.addEventListener("click", () => {
      testimonialTrack.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
  }
});
