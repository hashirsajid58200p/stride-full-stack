import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./Header.module.css";
import { useCart } from "../../../context/CartContext";
import { auth } from "../../../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const accountDropdownRef = useRef(null);

  // --- STATE MANAGEMENT ---
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Destructure cart controls from Context
  const { setIsCartOpen, cartItems } = useCart();

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [userAvatar, setUserAvatar] = useState({ url: null, initials: null });
  const [userRole, setUserRole] = useState(
    localStorage.getItem("userRole") || null,
  );

  // Calculate total items in cart for the badge
  const cartCount = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0,
  );

  // --- SCROLL LOGIC ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- THEME TOGGLE (Zero-Lag Optimized) ---
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    const isDark = theme === "dark";
    setLogoOpacity(0); // Fade out logo smoothly

    setTimeout(() => {
      const newTheme = isDark ? "light" : "dark";
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);

      setTimeout(() => setLogoOpacity(1), 50); // Fade logo back in
    }, 50);
  };

  // --- AUTH & AVATAR LOGIC (Preload & Firebase) ---
  useEffect(() => {
    const setupHeaderAvatar = (user) => {
      if (user) {
        let avatarUrl = user.photoURL;
        let displayName = user.displayName || "User";
        try {
          const localData = JSON.parse(
            localStorage.getItem(`stride_profile_${user.uid}`),
          );
          if (localData && localData.avatarUrl)
            avatarUrl = localData.avatarUrl;
          if (localData && localData.fullName)
            displayName = localData.fullName;
        } catch (e) {}
        const initials = displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();
        setUserAvatar({ url: avatarUrl, initials });
      } else {
        setUserAvatar({ url: null, initials: null });
      }
    };

    // 1. Preload from local storage if role exists (prevents flicker)
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    if (role && role !== "admin") {
      // Find ANY profile to show something instantly
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("stride_profile_")) {
          try {
            const localProfile = JSON.parse(localStorage.getItem(key));
            if (localProfile) {
              const initials = localProfile.fullName
                ? localProfile.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()
                : "U";
              setUserAvatar({ url: localProfile.avatarUrl, initials });
              break;
            }
          } catch (e) {}
        }
      }
    }

    // 2. Listen for actual auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setupHeaderAvatar(user);
      if (!user) {
        setUserRole(null);
        localStorage.removeItem("userRole");
      }
    });

    return () => unsubscribe();
  }, []);

  // --- CLICK OUTSIDE DROPDOWNS ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DYNAMIC SEARCH LOGIC ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      if (!window.supabase) {
        setSearchResults([
          { type: "error", message: "Database connecting... please wait." },
        ]);
        return;
      }

      try {
        const { data, error } = await window.supabase
          .from("products")
          .select("id, name, brand, price, main_image_url")
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(6);

        if (error) throw error;

        if (data.length === 0) {
          setSearchResults([
            { type: "error", message: `No products found matching "${query}"` },
          ]);
        } else {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([
          {
            type: "error",
            message: "Error performing search. Please try again.",
          },
        ]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- HANDLERS ---
  const handleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    document.body.style.overflow = !isMobileMenuOpen ? "hidden" : "";
  };

  const handleSearchModal = (isOpen) => {
    setIsSearchOpen(isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (!isOpen) setSearchQuery("");
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    const isLoggedIn = userRole || (window.auth && window.auth.currentUser);

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const dashboardPath =
      userRole === "admin"
        ? "/admin-dashboard"
        : "/user-dashboard?view=wishlist";
    navigate(dashboardPath);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem("userRole");
    signOut(auth)
      .then(() => navigate("/login"))
      .catch(() => navigate("/login"));
    setIsAccountOpen(false);
  };

  const checkActiveLink = (pathOrQuery) => {
    if (pathOrQuery.startsWith("?category=")) {
      return (
        location.pathname === "/products" && location.search === pathOrQuery
      );
    }
    return location.pathname === pathOrQuery;
  };

  return (
    <>
      <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}>
        <div className={`container ${styles["header-container"]}`}>
          <div className={styles["nav-content"]}>
            {/* Nav Left - Logo */}
            <div className={styles["nav-left"]}>
              <Link to="/" className={styles["logo-link"]} title="Home">
                <img
                  src={
                    theme === "dark"
                      ? "/images/logos/stride_logo_dark.png"
                      : "/images/logos/stride_logo_light.png"
                  }
                  alt="Stride Logo"
                  className={styles["logo-img"]}
                  style={{ opacity: logoOpacity }}
                />
              </Link>
            </div>

            {/* Nav Links (Desktop & Mobile) */}
            <div
              className={`${styles["nav-links"]} ${isMobileMenuOpen ? styles.active : ""}`}
            >
              <button
                className={styles["mobile-menu-close"]}
                onClick={handleMobileMenu}
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <Link
                to="/products?category=new-arrival"
                className={
                  checkActiveLink("?category=new-arrival") ? styles.active : ""
                }
                onClick={() => isMobileMenuOpen && handleMobileMenu()}
              >
                New Arrivals
              </Link>
              <Link
                to="/products?category=men"
                className={
                  checkActiveLink("?category=men") ? styles.active : ""
                }
                onClick={() => isMobileMenuOpen && handleMobileMenu()}
              >
                Men
              </Link>
              <Link
                to="/products?category=women"
                className={
                  checkActiveLink("?category=women") ? styles.active : ""
                }
                onClick={() => isMobileMenuOpen && handleMobileMenu()}
              >
                Women
              </Link>
              <Link
                to="/about"
                className={checkActiveLink("/about") ? styles.active : ""}
                onClick={() => isMobileMenuOpen && handleMobileMenu()}
              >
                About
              </Link>
              <Link
                to="/contact"
                className={checkActiveLink("/contact") ? styles.active : ""}
                onClick={() => isMobileMenuOpen && handleMobileMenu()}
              >
                Contact
              </Link>
            </div>

            {/* Nav Right - Icons */}
            <div className={styles["nav-right"]}>
              <button
                className={`${styles["icon-btn"]} ${styles["search-toggle-btn"]}`}
                onClick={() => handleSearchModal(true)}
                aria-label="Search"
              >
                <i className="bi bi-search"></i>
              </button>

              <button
                className={`${styles["icon-btn"]} ${styles["theme-toggle-btn"]}`}
                onClick={toggleTheme}
                aria-label="Toggle Theme"
              >
                <i
                  className={`bi ${theme === "dark" ? "bi-moon" : "bi-sun"}`}
                ></i>
              </button>

              <a
                href="#"
                className={`${styles["icon-btn"]} ${styles["wishlist-btn"]}`}
                onClick={handleWishlistClick}
                aria-label="Wishlist"
              >
                <i className="bi bi-heart"></i>
              </a>

              {/* UPDATED: Cart Button now triggers setIsCartOpen(true) */}
              <button
                className={`${styles["icon-btn"]} ${styles["cart-btn"]}`}
                aria-label="Shopping Cart"
                onClick={() => setIsCartOpen(true)}
              >
                <i className="bi bi-cart"></i>
                <span className={styles["cart-badge"]}>{cartCount}</span>
              </button>

              <button
                className={`${styles["mobile-menu-btn"]} ${styles["icon-btn"]}`}
                onClick={handleMobileMenu}
                aria-label="Menu"
              >
                <i className="bi bi-list"></i>
              </button>

              {/* Account Dropdown - Moved to Last position */}
              <div
                className={styles["account-container"]}
                ref={accountDropdownRef}
              >
                <button
                  className={`${styles["icon-btn"]} ${styles["account-btn"]} ${(userAvatar.url || userAvatar.initials) ? styles["avatar-active"] : ""}`}
                  aria-label="Account"
                  style={{ padding: 0 }}
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login");
                    } else {
                      setIsAccountOpen(!isAccountOpen);
                    }
                  }}
                >
                  {userAvatar.url || userAvatar.initials ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        fontSize: "0.95rem",
                        fontWeight: "bold",
                        color: "var(--color-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "var(--color-secondary)",
                        overflow: "hidden",
                      }}
                    >
                      {userAvatar.url ? (
                        <img
                          src={userAvatar.url}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          alt="Profile"
                        />
                      ) : (
                        <span>{userAvatar.initials}</span>
                      )}
                    </div>
                  ) : (
                    <i className="bi bi-person"></i>
                  )}
                </button>

                {currentUser && (
                  <div
                    className={`${styles["account-dropdown"]} ${isAccountOpen ? styles.show : ""}`}
                  >
                    <Link
                      to={
                        userRole === "admin"
                          ? "/admin-dashboard"
                          : "/user-dashboard"
                      }
                      className={styles["dropdown-item"]}
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <i className="bi bi-grid-1x2"></i>
                      <span>Dashboard</span>
                    </Link>
                    {userRole === "client" && (
                      <Link
                        to="/user-dashboard?view=profile"
                        className={styles["dropdown-item"]}
                        onClick={() => setIsAccountOpen(false)}
                      >
                        <i className="bi bi-person"></i>
                        <span>My Account</span>
                      </Link>
                    )}
                    <div className={styles["dropdown-divider"]}></div>
                    <a
                      href="#"
                      className={styles["dropdown-item"]}
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Logout</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`${styles["mobile-menu-overlay"]} ${isMobileMenuOpen ? styles.active : ""}`}
        onClick={handleMobileMenu}
      ></div>

      {/* Search Modal Overlay */}
      <div
        className={`${styles["search-modal-overlay"]} ${isSearchOpen ? styles.active : ""}`}
        onClick={(e) =>
          e.target === e.currentTarget && handleSearchModal(false)
        }
      >
        <div className={styles["search-modal-content"]}>
          <div className={styles["search-modal-header"]}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search for sneakers, brands..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={isSearchOpen}
            />
            <button
              className={styles["close-search-btn"]}
              onClick={() => handleSearchModal(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className={styles["search-results"]}>
            {isSearching && (
              <div className={styles["no-search-results"]}>Searching...</div>
            )}

            {!isSearching &&
              searchResults.map((result, idx) => {
                if (result.type === "error") {
                  return (
                    <div key={idx} className={styles["no-search-results"]}>
                      {result.message}
                    </div>
                  );
                }

                return (
                  <Link
                    key={result.id}
                    to={`/product-detail?id=${result.id}`}
                    className={styles["search-result-item"]}
                    onClick={() => handleSearchModal(false)}
                  >
                    <img
                      src={result.main_image_url}
                      alt={result.name}
                      className={styles["search-result-img"]}
                    />
                    <div className={styles["search-result-info"]}>
                      <span className={styles["search-result-brand"]}>
                        {result.brand}
                      </span>
                      <span className={styles["search-result-name"]}>
                        {result.name}
                      </span>
                      <span className={styles["search-result-price"]}>
                        {typeof window.formatPrice === "function"
                          ? window.formatPrice(result.price)
                          : `$${result.price.toFixed(2)}`}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}
