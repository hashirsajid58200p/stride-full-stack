document.addEventListener("DOMContentLoaded", () => {
  const productCards = document.querySelectorAll(".product-card");
  const noResultsDiv = document.getElementById("no-results");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const searchInput = document.getElementById("product-search");

  const categoryBtns = document.querySelectorAll(
    "#category-filter .sidebar-btn",
  );
  const brandBtns = document.querySelectorAll("#brand-filter .sidebar-btn");
  const sidebar = document.getElementById("productsSidebar");
  const sidebarToggleBtn = document.getElementById("mobileSidebarToggle");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

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

  let activeCategory = "all";
  let activeBrand = "all";
  let searchQuery = "";

  // ==========================================
  // URL Parameter Logic (Reads Header Clicks on Load)
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get("category");

  if (categoryParam) {
    activeCategory = categoryParam;
    categoryBtns.forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(
      `#category-filter .sidebar-btn[data-filter="${categoryParam}"]`,
    );
    if (activeBtn) activeBtn.classList.add("active");
  }

  // ==========================================
  // Dynamic Sync (Reads Header Clicks while already on page)
  // ==========================================
  window.addEventListener("categoryChanged", (e) => {
    activeCategory = e.detail;
    categoryBtns.forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(
      `#category-filter .sidebar-btn[data-filter="${activeCategory}"]`,
    );
    if (activeBtn) activeBtn.classList.add("active");
    filterProducts();
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

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-filter");

      const newUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname +
        "?category=" +
        activeCategory;
      window.history.pushState({ path: newUrl }, "", newUrl);

      filterProducts();
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  brandBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      brandBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeBrand = btn.getAttribute("data-brand");
      filterProducts();
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterProducts();
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
    if (minPriceInput.value && minPriceInput.value < 0)
      minPriceInput.value = Math.abs(minPriceInput.value);
    if (maxPriceInput.value && maxPriceInput.value < 0)
      maxPriceInput.value = Math.abs(maxPriceInput.value);

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
    } else if (min !== "" && max !== "" && parseFloat(min) > parseFloat(max)) {
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
        minPriceInput.value = Math.abs(minPriceInput.value);
      if (priceErrorMsg.style.display === "block") validatePriceRange();
    });
    maxPriceInput.addEventListener("input", () => {
      if (maxPriceInput.value < 0)
        maxPriceInput.value = Math.abs(maxPriceInput.value);
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
      filterProducts();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      activeCategory = "all";
      activeBrand = "all";
      searchQuery = "";
      if (searchInput) searchInput.value = "";

      const newUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;
      window.history.pushState({ path: newUrl }, "", newUrl);

      categoryBtns.forEach((b) => b.classList.remove("active"));
      document
        .querySelector('#category-filter .sidebar-btn[data-filter="all"]')
        .classList.add("active");

      brandBtns.forEach((b) => b.classList.remove("active"));
      document
        .querySelector('#brand-filter .sidebar-btn[data-brand="all"]')
        .classList.add("active");

      filterProducts();
    });
  }

  function filterProducts() {
    let visibleCount = 0;

    productCards.forEach((card) => {
      const cardCategories = card.getAttribute("data-category").split(" ");
      const cardBrand = card.getAttribute("data-brand");
      const cardName = card
        .querySelector(".product-name")
        .textContent.toLowerCase();

      const matchesCategory =
        activeCategory === "all" || cardCategories.includes(activeCategory);
      const matchesBrand = activeBrand === "all" || cardBrand === activeBrand;
      const matchesSearch =
        searchQuery === "" || cardName.includes(searchQuery);

      if (matchesCategory && matchesBrand && matchesSearch) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

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

  filterProducts();

  const wishlistBtns = document.querySelectorAll(".action-btn-wishlist");
  wishlistBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      btn.classList.toggle("active");
      const icon = btn.querySelector("i");
      if (btn.classList.contains("active")) {
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
});
