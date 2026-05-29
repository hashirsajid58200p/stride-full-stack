import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getApiUrl } from "../../utils/apiConfig";
import ProductCards from "../../components/ECommerce/ProductCards";
import SkeletonAnimation from "../../components/UI/SkeletonAnimation";
import styles from "./Products.module.css";
import { useCurrency } from "../../context/CurrencyContext";
import Pagination from "../../components/UI/Pagination";
import CustomCheckbox from "../../components/UI/CustomCheckbox";

const DEFAULT_SIDEBAR = {
  categories: ["Men", "Women", "Universal", "New Arrival"],
  brands: ["Nike", "Adidas", "Puma", "New Balance", "Jordan"],
};

export default function Products() {
  const { currency, rate, symbol } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  // Data State
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Sidebar Filters (Live applied)
  const [activeBrand, setActiveBrand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [vectorResults, setVectorResults] = useState(null);
  const [isVectorLoading, setIsVectorLoading] = useState(false);

  // Modal / UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  // Advanced Filters State (Applied on form submit)
  const [appliedFilters, setAppliedFilters] = useState({
    minPrice: "",
    maxPrice: "",
    sizes: [],
    sort: "default",
  });

  // Draft Filters (Bound to the modal inputs before clicking apply)
  const [draftFilters, setDraftFilters] = useState({
    minPrice: "",
    maxPrice: "",
    sizes: [],
    sort: "default",
  });
  const [priceError, setPriceError] = useState("");

  const dropdownRef = useRef(null);

  // 1. Fetch Data & Setup Defaults
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!window.supabase) throw new Error("Database not connected.");

        const { data, error } = await window.supabase
          .from("products")
          .select("*, product_sizes ( size ), reviews ( rating )")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    };

    if (window.supabase) fetchProducts();
    else {
      window.addEventListener("supabaseInitialized", fetchProducts);
      return () =>
        window.removeEventListener("supabaseInitialized", fetchProducts);
    }
  }, []);

  // 3. Dropdown Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Handle URL/Sidebar Changes
  const handleCategoryChange = (cat) => {
    if (cat === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat);
    }
    setSearchParams(searchParams);
    setIsSidebarOpen(false);
    setCurrentPage(1); // Reset to page 1 on category change
  };

  const handleBrandChange = (brand) => {
    setActiveBrand(brand);
    setIsSidebarOpen(false);
    setCurrentPage(1); // Reset to page 1 on brand change
  };

  // 5. Modal Handlers
  const handleDraftSizeToggle = (size) => {
    setDraftFilters((prev) => {
      const sizes = prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes };
    });
  };

  const validateAndApplyFilters = (e) => {
    e.preventDefault();
    const min = parseInt(draftFilters.minPrice, 10);
    const max = parseInt(draftFilters.maxPrice, 10);

    if (draftFilters.minPrice !== "" && draftFilters.maxPrice === "") {
      setPriceError("Please enter a maximum price.");
      return;
    }
    if (draftFilters.maxPrice !== "" && draftFilters.minPrice === "") {
      setPriceError("Please enter a minimum price.");
      return;
    }
    if (!isNaN(min) && !isNaN(max) && min > max) {
      setPriceError("Minimum price cannot be greater than Maximum price.");
      return;
    }

    setPriceError("");
    setAppliedFilters(draftFilters);
    setIsFilterModalOpen(false);
    setCurrentPage(1); // Reset to page 1 on filter application
    if (window.showToast)
      window.showToast("Advanced Filters Applied", "success");
  };

  const clearAllFilters = () => {
    searchParams.delete("category");
    setSearchParams(searchParams);
    setActiveBrand("all");
    setSearchQuery("");
    const resetFilters = {
      minPrice: "",
      maxPrice: "",
      sizes: [],
      sort: "default",
    };
    setDraftFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setPriceError("");
    setCurrentPage(1);
  };

  // 6. The Core Filtering & Sorting Engine (Derived State)
  const filteredProducts = useMemo(() => {
    // If we have vector results from AI search, use them as base
    let result = vectorResults ? [...vectorResults] : [...products];

    // Exchange Rate Normalization
    const rate = parseFloat(localStorage.getItem("strideExchangeRate")) || 1;
    const minUSD = appliedFilters.minPrice
      ? parseFloat(appliedFilters.minPrice) / rate
      : 0;
    const maxUSD = appliedFilters.maxPrice
      ? parseFloat(appliedFilters.maxPrice) / rate
      : Infinity;

    // Filters
    result = result.filter((p) => {
      const pTags = (p.tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"));
      const pBrand = (p.brand || "").trim().toLowerCase().replace(/\s+/g, "-");
      const pSizes = p.product_sizes ? p.product_sizes.map((s) => s.size) : [];
      const pName = p.name.toLowerCase();

      const matchesCat =
        activeCategory === "all" || pTags.includes(activeCategory);
      const matchesBrand = activeBrand === "all" || pBrand === activeBrand;
      const matchesSearch =
        vectorResults || // If vector search is active, we don't need keyword matching
        searchQuery === "" ||
        pName.includes(searchQuery.toLowerCase()) ||
        pBrand.includes(searchQuery.toLowerCase());
      const matchesPrice = p.price >= minUSD && p.price <= maxUSD;
      const matchesSize =
        appliedFilters.sizes.length === 0 ||
        appliedFilters.sizes.some((s) => pSizes.includes(s));

      return (
        matchesCat &&
        matchesBrand &&
        matchesSearch &&
        matchesPrice &&
        matchesSize
      );
    });

    // Sorting
    result.sort((a, b) => {
      switch (appliedFilters.sort) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return new Date(b.created_at) - new Date(a.created_at); // Default newest first
      }
    });

    return result;
  }, [products, activeCategory, activeBrand, searchQuery, appliedFilters, vectorResults]);

  // 7. Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset page and vector results when search query changes
  useEffect(() => {
    setCurrentPage(1);
    if (searchQuery === "") {
      setVectorResults(null);
      return;
    }

    // Debounce Vector Search
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsVectorLoading(true);
        try {
          const res = await fetch(getApiUrl("/api/products/search-semantic"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery }),
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            setVectorResults(data);
          }
        } catch (err) {
          console.error("Vector search failed:", err);
        } finally {
          setIsVectorLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Read config safely
  let sidebarConfig = DEFAULT_SIDEBAR;
  try {
    const stored = localStorage.getItem("stride_sidebar_filters");
    if (stored) sidebarConfig = JSON.parse(stored);
  } catch (e) {}

  const sortOptions = [
    { value: "default", label: "Default" },
    { value: "name-asc", label: "A to Z" },
    { value: "name-desc", label: "Z to A" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];
  const activeSortLabel =
    sortOptions.find((o) => o.value === draftFilters.sort)?.label || "Default";

  return (
    <>
      <div
        className={`${styles["sidebar-overlay"]} ${isSidebarOpen ? styles.active : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <main className={styles["products-page"]}>
        <div
          className={`container ${styles.container} ${styles["products-layout"]}`}
        >
          {/* SIDEBAR */}
          <aside
            className={`${styles["products-sidebar"]} ${isSidebarOpen ? styles.active : ""}`}
          >
            <button
              className={styles["close-sidebar-btn"]}
              onClick={() => setIsSidebarOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div className={styles["sidebar-section"]}>
              <h3 className={styles["sidebar-title"]}>Categories</h3>
              <ul className={styles["sidebar-list"]}>
                <li>
                  <button
                    className={`${styles["sidebar-btn"]} ${activeCategory === "all" ? styles.active : ""}`}
                    onClick={() => handleCategoryChange("all")}
                  >
                    All Products
                  </button>
                </li>
                {sidebarConfig.categories.map((cat) => {
                  const val = cat.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <li key={val}>
                      <button
                        className={`${styles["sidebar-btn"]} ${activeCategory === val ? styles.active : ""}`}
                        onClick={() => handleCategoryChange(val)}
                      >
                        {cat}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles["sidebar-section"]}>
              <h3 className={styles["sidebar-title"]}>Brands</h3>
              <ul className={styles["sidebar-list"]}>
                <li>
                  <button
                    className={`${styles["sidebar-btn"]} ${activeBrand === "all" ? styles.active : ""}`}
                    onClick={() => handleBrandChange("all")}
                  >
                    All Brands
                  </button>
                </li>
                {sidebarConfig.brands.map((brand) => {
                  const val = brand.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <li key={val}>
                      <button
                        className={`${styles["sidebar-btn"]} ${activeBrand === val ? styles.active : ""}`}
                        onClick={() => handleBrandChange(val)}
                      >
                        {brand}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className={styles["products-main"]}>
            <div className={styles["products-header"]}>
              <h1 className={styles["page-title"]}>Our Collection</h1>

              <div className={styles["search-filter-group"]}>
                <button
                  className={`${styles["btn-outline"]} ${styles["mobile-sidebar-toggle"]}`}
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <i className="bi bi-layout-sidebar"></i> Categories
                </button>

                <div className={styles["search-bar"]}>
                  <i className={`bi bi-search ${styles["search-icon"]}`}></i>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  className={`${styles["btn-outline"]} ${styles["filter-toggle-btn"]}`}
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <i className="bi bi-sliders"></i> Filters
                </button>
              </div>
            </div>

            <div className={styles["featured-products-override"]}>
              {isLoading || isVectorLoading ? (
                <SkeletonAnimation count={6} />
              ) : error ? (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    color: "#ef4444",
                  }}
                >
                  {error}
                </div>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((p, i) => (
                  <ProductCards key={p.id} product={p} index={i} />
                ))
              ) : null}
            </div>

            {/* PAGINATION UI */}
            {!isLoading && totalPages > 1 && (
              <div className={styles.pagination}>
                <Pagination 
                  totalPages={totalPages} 
                  current={currentPage} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}

            {!isLoading && filteredProducts.length === 0 && !error && (
              <div className={styles["no-results"]}>
                <i className="bi bi-search"></i>
                <h2>No products found</h2>
                <p>Try adjusting your category, brand, or search filters.</p>
                <button
                  className={styles["btn-primary"]}
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FILTER MODAL */}
      <div
        className={`${styles["modal-overlay"]} ${isFilterModalOpen ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsFilterModalOpen(false);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3>Advanced Filters</h3>
            <button
              className={styles["close-modal"]}
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <form
            className={styles["modal-form"]}
            onSubmit={validateAndApplyFilters}
          >
            {/* Sort Dropdown */}
            <div className={styles["form-group"]}>
              <label>Sort By</label>
              <div
                className={`${styles["custom-select-wrapper"]} ${isSortDropdownOpen ? styles.open : ""}`}
                ref={dropdownRef}
              >
                <div
                  className={styles["custom-select-display"]}
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                >
                  <span>{activeSortLabel}</span>
                  <i className="bi bi-chevron-down"></i>
                </div>
                <div className={styles["custom-select-options"]}>
                  {sortOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles["custom-select-option"]} ${draftFilters.sort === opt.value ? styles.selected : ""}`}
                      onClick={() => {
                        setDraftFilters({ ...draftFilters, sort: opt.value });
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className={styles["form-group"]}>
              <label>Price Range</label>
              <div className={styles["price-row"]}>
                <input
                  type="number"
                  placeholder={`Min ${symbol}`}
                  min="0"
                  step="1"
                  className={styles["form-input"]}
                  value={draftFilters.minPrice}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      minPrice: Math.abs(e.target.value) || "",
                    })
                  }
                />
                <input
                  type="number"
                  placeholder={`Max ${symbol}`}
                  min="0"
                  step="1"
                  className={styles["form-input"]}
                  value={draftFilters.maxPrice}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      maxPrice: Math.abs(e.target.value) || "",
                    })
                  }
                />
              </div>
              {priceError && (
                <p className={styles["error-msg"]} style={{ display: "block" }}>
                  {priceError}
                </p>
              )}
            </div>

            {/* Size Checkboxes */}
            <div className={styles["form-group"]}>
              <label>Available Sizes</label>
              <div className={styles["checkbox-grid"]}>
                {["7", "8", "9", "10", "11", "12"].map((size) => (
                  <CustomCheckbox
                    key={size}
                    id={`filter-size-${size}`}
                    label={`Size ${size}`}
                    checked={draftFilters.sizes.includes(size)}
                    onChange={() => handleDraftSizeToggle(size)}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`${styles["btn-primary"]} ${styles["full-width"]}`}
            >
              Apply Filters
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
