// client/src/scripts/pages/products.js

document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.getElementById("product-grid");
  const noResultsDiv = document.getElementById("no-results");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const searchInput = document.getElementById("product-search");

  const sidebar = document.getElementById("productsSidebar");
  const sidebarToggleBtn = document.getElementById("mobileSidebarToggle");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const categoryFilterUl = document.getElementById("category-filter");
  const brandFilterUl = document.getElementById("brand-filter");

  const filterModal = document.getElementById("advancedFilterModal");
  const openFilterBtn = document.getElementById("openFilterModal");
  const closeFilterBtn = document.getElementById("closeFilterModal");
  const applyFiltersForm = document.getElementById("applyFiltersForm");

  const customSelectWrapper = document.getElementById("sortDropdownWrapper");
  const customSelectDisplay = document.getElementById("sortDropdownDisplay");
  const customSelectText = document.getElementById("sortDropdownText");
  const customSelectOptions = document.querySelectorAll(
    ".custom-select-option",
  );
  const sortValueHidden = document.getElementById("sort-value-hidden");

  const minPriceInput = document.getElementById("min-price");
  const maxPriceInput = document.getElementById("max-price");
  const priceErrorMsg = document.getElementById("price-error");

  let rawCategory =
    new URLSearchParams(window.location.search).get("category") || "all";
  let activeCategory = rawCategory.toLowerCase().replace(/\s+/g, "-");
  let activeBrand = "all";
  let searchQuery = "";
  let allProductsData = [];

  // ==========================================
  // CURRENCY UI UPDATER
  // ==========================================
  function updatePricePlaceholders() {
    const currency = localStorage.getItem("strideCurrency") || "USD";
    const symbol =
      currency === "PKR" ? "Rs" : currency === "USD" ? "$" : currency;

    if (minPriceInput) minPriceInput.placeholder = `Min ${symbol}`;
    if (maxPriceInput) maxPriceInput.placeholder = `Max ${symbol}`;
  }

  // Listen for currency being initialized or changed
  window.addEventListener("currencyUpdated", updatePricePlaceholders);
  updatePricePlaceholders(); // Initial call

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
  // FETCH PRODUCTS FROM SUPABASE
  // ==========================================
  async function fetchProducts() {
    try {
      if (!window.supabase) {
        console.warn("Waiting for Supabase...");
        window.addEventListener("supabaseInitialized", fetchProducts);
        return;
      }

      // Load the skeleton component dynamically
      await loadSkeletonComponent();

      // UX OPTIMIZATION: Inject 6 Skeleton Cards immediately while loading
      productGrid.innerHTML = window.renderSkeletonCardTemplate(6);

      await loadProductCardsComponent();

      // OPTIMIZATION: Fetch products, sizes, AND reviews all at once
      const { data, error } = await window.supabase
        .from("products")
        .select(
          `
            *,
            product_sizes ( size ),
            reviews ( rating )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      allProductsData = data;
      generateSidebar();
      renderProducts(allProductsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      productGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 2rem;">Failed to load products.</div>`;
    }
  }

  function generateSidebar() {
    let sidebarConfig = JSON.parse(
      localStorage.getItem("stride_sidebar_filters"),
    );

    if (!sidebarConfig) {
      sidebarConfig = {
        categories: ["Men", "Women", "Universal", "New Arrival"],
        brands: ["Nike", "Adidas", "Puma", "New Balance", "Jordan"],
      };
    }

    let categoryHTML = `<li><button class="sidebar-btn ${activeCategory === "all" ? "active" : ""}" data-filter="all">All Products</button></li>`;
    sidebarConfig.categories.forEach((cat) => {
      const filterValue = cat.toLowerCase().replace(/\s+/g, "-");
      const isActive = activeCategory === filterValue ? "active" : "";
      categoryHTML += `<li><button class="sidebar-btn ${isActive}" data-filter="${filterValue}">${cat}</button></li>`;
    });
    categoryFilterUl.innerHTML = categoryHTML;

    let brandHTML = `<li><button class="sidebar-btn ${activeBrand === "all" ? "active" : ""}" data-brand="all">All Brands</button></li>`;
    sidebarConfig.brands.forEach((brand) => {
      const filterValue = brand.toLowerCase().replace(/\s+/g, "-");
      const isActive = activeBrand === filterValue ? "active" : "";
      brandHTML += `<li><button class="sidebar-btn ${isActive}" data-brand="${filterValue}">${brand}</button></li>`;
    });
    brandFilterUl.innerHTML = brandHTML;
  }

  function renderProducts(productsToRender) {
    productGrid.innerHTML = "";

    if (productsToRender.length === 0) {
      noResultsDiv.style.display = "block";
      return;
    }

    noResultsDiv.style.display = "none";

    const productsHTML = productsToRender
      .map((p, index) =>
        window.renderProductCardTemplate
          ? window.renderProductCardTemplate(p, index)
          : "",
      )
      .join("");

    productGrid.innerHTML = productsHTML;

    attachWishlistListeners();
    applyFilters();
  }

  fetchProducts();

  // ==========================================
  // SIDEBAR EVENT DELEGATION
  // ==========================================

  categoryFilterUl.addEventListener("click", (e) => {
    if (e.target.classList.contains("sidebar-btn")) {
      document
        .querySelectorAll("#category-filter .sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      activeCategory = e.target.getAttribute("data-filter");

      const newUrl = new URL(window.location.href);
      if (activeCategory === "all") {
        newUrl.searchParams.delete("category");
      } else {
        newUrl.searchParams.set("category", activeCategory);
      }
      window.history.pushState({ path: newUrl.href }, "", newUrl.href);

      applyFilters();
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  brandFilterUl.addEventListener("click", (e) => {
    if (e.target.classList.contains("sidebar-btn")) {
      document
        .querySelectorAll("#brand-filter .sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      activeBrand = e.target.getAttribute("data-brand");

      applyFilters();
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  window.addEventListener("categoryChanged", (e) => {
    activeCategory = e.detail;
    const activeBtn = document.querySelector(
      `#category-filter .sidebar-btn[data-filter="${activeCategory}"]`,
    );
    if (activeBtn) {
      document
        .querySelectorAll("#category-filter .sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      activeBtn.classList.add("active");
    }
    applyFilters();
  });

  function openSidebar() {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", openSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  if (openFilterBtn) {
    openFilterBtn.addEventListener("click", () => {
      filterModal.classList.add("active");
    });
  }

  if (closeFilterBtn) {
    closeFilterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      filterModal.classList.remove("active");
      if (priceErrorMsg) priceErrorMsg.style.display = "none";
      if (minPriceInput) minPriceInput.style.borderColor = "";
      if (maxPriceInput) maxPriceInput.style.borderColor = "";
    });
  }

  if (customSelectWrapper) {
    customSelectDisplay.addEventListener("click", () => {
      customSelectWrapper.classList.toggle("open");
    });

    customSelectOptions.forEach((option) => {
      option.addEventListener("click", function () {
        customSelectOptions.forEach((opt) => opt.classList.remove("selected"));
        this.classList.add("selected");

        const value = this.getAttribute("data-value");
        const text = this.textContent;
        customSelectText.textContent = text;
        sortValueHidden.value = value;

        customSelectWrapper.classList.remove("open");
      });
    });

    document.addEventListener("click", (e) => {
      if (!customSelectWrapper.contains(e.target)) {
        customSelectWrapper.classList.remove("open");
      }
    });
  }

  function validatePriceRange() {
    if (minPriceInput.value && parseInt(minPriceInput.value, 10) < 0)
      minPriceInput.value = Math.abs(parseInt(minPriceInput.value, 10));
    if (maxPriceInput.value && parseInt(maxPriceInput.value, 10) < 0)
      maxPriceInput.value = Math.abs(parseInt(maxPriceInput.value, 10));

    const min = minPriceInput.value;
    const max = maxPriceInput.value;

    priceErrorMsg.style.display = "none";
    minPriceInput.style.borderColor = "";
    maxPriceInput.style.borderColor = "";

    let isValid = true;

    if (min !== "" && max === "") {
      priceErrorMsg.textContent = "Please enter a maximum price.";
      priceErrorMsg.style.display = "block";
      maxPriceInput.style.borderColor = "#ef4444";
      isValid = false;
    } else if (min === "" && max !== "") {
      priceErrorMsg.textContent = "Please enter a minimum price.";
      priceErrorMsg.style.display = "block";
      minPriceInput.style.borderColor = "#ef4444";
      isValid = false;
    } else if (
      min !== "" &&
      max !== "" &&
      parseInt(min, 10) > parseInt(max, 10)
    ) {
      priceErrorMsg.textContent =
        "Minimum price cannot be greater than Maximum price.";
      priceErrorMsg.style.display = "block";
      minPriceInput.style.borderColor = "#ef4444";
      maxPriceInput.style.borderColor = "#ef4444";
      isValid = false;
    }

    return isValid;
  }

  if (minPriceInput && maxPriceInput) {
    minPriceInput.addEventListener("input", () => {
      if (minPriceInput.value < 0)
        minPriceInput.value = Math.abs(parseInt(minPriceInput.value, 10));
      if (priceErrorMsg.style.display === "block") validatePriceRange();
    });
    maxPriceInput.addEventListener("input", () => {
      if (maxPriceInput.value < 0)
        maxPriceInput.value = Math.abs(parseInt(maxPriceInput.value, 10));
      if (priceErrorMsg.style.display === "block") validatePriceRange();
    });
  }

  if (applyFiltersForm) {
    applyFiltersForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validatePriceRange()) {
        return;
      }
      if (typeof window.showToast === "function")
        window.showToast("Advanced Filters Applied");
      filterModal.classList.remove("active");

      applyFilters();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      activeCategory = "all";
      activeBrand = "all";
      searchQuery = "";
      if (searchInput) searchInput.value = "";

      if (minPriceInput) minPriceInput.value = "";
      if (maxPriceInput) maxPriceInput.value = "";
      document
        .querySelectorAll('input[name="filter-size"]')
        .forEach((cb) => (cb.checked = false));

      if (sortValueHidden) sortValueHidden.value = "default";
      if (customSelectText) customSelectText.textContent = "Default";
      customSelectOptions.forEach((opt) => opt.classList.remove("selected"));
      const defaultSortOpt = document.querySelector(
        '.custom-select-option[data-value="default"]',
      );
      if (defaultSortOpt) defaultSortOpt.classList.add("selected");

      const newUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;
      window.history.pushState({ path: newUrl }, "", newUrl);

      document
        .querySelectorAll("#category-filter .sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      const allCat = document.querySelector(
        '#category-filter .sidebar-btn[data-filter="all"]',
      );
      if (allCat) allCat.classList.add("active");

      document
        .querySelectorAll("#brand-filter .sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      const allBrand = document.querySelector(
        '#brand-filter .sidebar-btn[data-brand="all"]',
      );
      if (allBrand) allBrand.classList.add("active");

      applyFilters();
    });
  }

  function applyFilters() {
    const currentCards = document.querySelectorAll(".product-card");
    let visibleCount = 0;

    // NEW LOGIC: Get current exchange rate to convert user input back to USD
    const rate = parseFloat(localStorage.getItem("strideExchangeRate")) || 1;

    // Convert local price input (e.g. PKR) back to USD for comparison
    const minPriceUSD =
      minPriceInput && minPriceInput.value
        ? parseFloat(minPriceInput.value) / rate
        : 0;
    const maxPriceUSD =
      maxPriceInput && maxPriceInput.value
        ? parseFloat(maxPriceInput.value) / rate
        : Infinity;

    const sortValue = sortValueHidden ? sortValueHidden.value : "default";

    const selectedSizes = Array.from(
      document.querySelectorAll('input[name="filter-size"]:checked'),
    ).map((cb) => cb.value);

    const cardsArray = Array.from(currentCards);

    cardsArray.forEach((card) => {
      const cardCategories = card.getAttribute("data-category") || "";
      const cardCategoryArray = cardCategories.split(" ");

      const cardBrand = card.getAttribute("data-brand") || "";
      const cardPrice = parseFloat(card.getAttribute("data-price") || 0);
      const cardSizes = card.getAttribute("data-sizes") || "";
      const cardSizeArray = cardSizes.split(",");

      const cardName = card
        .querySelector(".product-name")
        .textContent.toLowerCase();

      const matchesCategory =
        activeCategory === "all" || cardCategoryArray.includes(activeCategory);
      const matchesBrand = activeBrand === "all" || cardBrand === activeBrand;

      const matchesSearch =
        searchQuery === "" ||
        cardName.includes(searchQuery) ||
        cardBrand.includes(searchQuery);

      // Comparison now happens correctly in USD
      const matchesPrice = cardPrice >= minPriceUSD && cardPrice <= maxPriceUSD;

      let matchesSize = true;
      if (selectedSizes.length > 0) {
        matchesSize = selectedSizes.some((size) =>
          cardSizeArray.includes(size),
        );
      }

      if (
        matchesCategory &&
        matchesBrand &&
        matchesSearch &&
        matchesPrice &&
        matchesSize
      ) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    cardsArray.sort((a, b) => {
      const priceA = parseFloat(a.getAttribute("data-price"));
      const priceB = parseFloat(b.getAttribute("data-price"));
      const nameA = a.querySelector(".product-name").textContent.toLowerCase();
      const nameB = b.querySelector(".product-name").textContent.toLowerCase();

      if (sortValue === "price-low") {
        return priceA - priceB;
      } else if (sortValue === "price-high") {
        return priceB - priceA;
      } else if (sortValue === "name-desc") {
        return nameB.localeCompare(nameA);
      } else if (sortValue === "name-asc") {
        return nameA.localeCompare(nameB);
      } else {
        return (
          parseInt(a.getAttribute("data-index"), 10) -
          parseInt(b.getAttribute("data-index"), 10)
        );
      }
    });

    cardsArray.sort((a, b) => {
      const priceA = parseFloat(a.getAttribute("data-price"));
      const priceB = parseFloat(b.getAttribute("data-price"));
      const nameA = a.querySelector(".product-name").textContent.toLowerCase();
      const nameB = b.querySelector(".product-name").textContent.toLowerCase();

      if (sortValue === "price-low") {
        return priceA - priceB;
      } else if (sortValue === "price-high") {
        return priceB - priceA;
      } else if (sortValue === "name-desc") {
        return nameB.localeCompare(nameA);
      } else if (sortValue === "name-asc") {
        return nameA.localeCompare(nameB);
      } else {
        return (
          parseInt(a.getAttribute("data-index"), 10) -
          parseInt(b.getAttribute("data-index"), 10)
        );
      }
    });

    cardsArray.forEach((card) => productGrid.appendChild(card));

    const resultsCount = document.getElementById("results-count");
    if (resultsCount) {
      resultsCount.textContent = `Showing ${visibleCount} product${visibleCount !== 1 ? "s" : ""}`;
    }

    if (visibleCount === 0) {
      noResultsDiv.style.display = "block";
    } else {
      noResultsDiv.style.display = "none";
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
});
