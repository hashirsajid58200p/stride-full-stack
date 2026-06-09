import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getApiUrl } from "../../utils/apiConfig";
import { useCart } from "../../context/CartContext";
import {
  deleteUser,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { getDatabase, ref, get } from "firebase/database";
import Wishlist from "../../components/ECommerce/Wishlist";
import ProfileLoader from "../../components/UI/ProfileLoader";
import ProfileSettings from "../../components/ECommerce/ProfileSettings/ProfileSettings";
import styles from "./UserDashboard.module.css";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dwagwbklz/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "dashboard";
  const { cartItems, setIsCartOpen } = useCart();

  // App State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbUser, setDbUser] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    avatarUrl: null,
  });
  const [orders, setOrders] = useState([]);
  const [latestDrops, setLatestDrops] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [wishlistPreview, setWishlistPreview] = useState([]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Modals
  const [logoutModal, setLogoutModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Refs
  const wishlistScrollRef = useRef(null);
  const ordersScrollRef = useRef(null);
  const avatarDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // ==========================================
  // INITIALIZATION & AUTH
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const role = localStorage.getItem("userRole");
        if (role === "admin") {
          navigate("/admin-dashboard", { replace: true });
        } else {
          initUserData(currentUser);
          setAuthLoading(false);
        }
      } else {
        navigate("/login", { replace: true });
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, activeView]);

  const initUserData = (currentUser) => {
    setUser(currentUser);
    let extraData = { phone: "", address: "", postalCode: "", avatarUrl: "" };
    const extraDataStr = localStorage.getItem(`stride_profile_${currentUser.uid}`);
    if (extraDataStr) extraData = JSON.parse(extraDataStr);

    let activeAvatarUrl = currentUser.photoURL;
    if (extraData.avatarUrl && extraData.avatarUrl.includes("cloudinary")) {
      activeAvatarUrl = extraData.avatarUrl;
    }

    setDbUser({
      fullName: currentUser.displayName || "Valued Customer",
      email: currentUser.email || "No email provided",
      phone: extraData.phone || currentUser.phoneNumber || "",
      address: extraData.address || "",
      postalCode: extraData.postalCode || "",
      avatarUrl: activeAvatarUrl || null,
    });
  };

  // ==========================================
  // DATA FETCHING
  // ==========================================
  useEffect(() => {
    if (!user || !window.supabase) return;

    const fetchData = async () => {
      try {
        // Orders
        const { data: ordersData } = await window.supabase
          .from("orders")
          .select("*")
          .ilike("email", user.email)
          .order("created_at", { ascending: false });

        if (ordersData) {
          const processed = ordersData.map((order) => {
            if (typeof order.items === "string")
              try {
                order.items = JSON.parse(order.items);
              } catch (e) {}
            if (!order.is_manual_override) {
              const diffHours =
                (new Date() - new Date(order.created_at)) / (1000 * 60 * 60);
              if (diffHours > 72) order.status = "Delivered";
              else if (diffHours > 24) order.status = "Shipped";
              else if (diffHours > 1) order.status = "Processing";
              else order.status = "Pending";
            }
            return order;
          });
          setOrders(processed);
        }

        // Drops
        const { data: dropsData } = await window.supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);
        if (dropsData) setLatestDrops(dropsData);

        // Notifications
        const { data: notifData } = await window.supabase
          .from("platform_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        if (notifData) setNotifications(notifData);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      }
    };
    fetchData();
  }, [user]);

  // Wishlist Local Storage Sync for Preview
  useEffect(() => {
    const updatePreview = () => {
      if (window.WishlistEngine) {
        setWishlistPreview(window.WishlistEngine.get().slice(0, 4));
      } else {
        const key = user ? `strideWishlist_${user.uid}` : "strideWishlist";
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        setWishlistPreview(items.slice(0, 4));
      }
    };
    updatePreview();
    window.addEventListener("wishlistUpdated", updatePreview);
    return () => window.removeEventListener("wishlistUpdated", updatePreview);
  }, [user]);

  // ==========================================
  // HANDLERS: UI & EVENTS
  // ==========================================
  const switchView = (target) => {
    setSearchParams({ view: target });
    setIsSidebarOpen(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        avatarDropdownRef.current &&
        !avatarDropdownRef.current.contains(e.target)
      )
        setIsAvatarDropdownOpen(false);
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target)
      )
        setIsNotifDropdownOpen(false);
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target)
      )
        setIsSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Horizontal Scroll
  useEffect(() => {
    const handleWheel = (e, ref) => {
      if (Math.abs(e.deltaX) > 0) return;
      if (e.deltaY !== 0 && ref.current) {
        e.preventDefault();
        ref.current.scrollLeft += e.deltaY;
      }
    };
    const wishNode = wishlistScrollRef.current;
    const orderNode = ordersScrollRef.current;

    const wishWheel = (e) => handleWheel(e, wishlistScrollRef);
    const orderWheel = (e) => handleWheel(e, ordersScrollRef);

    if (wishNode)
      wishNode.addEventListener("wheel", wishWheel, { passive: false });
    if (orderNode)
      orderNode.addEventListener("wheel", orderWheel, { passive: false });

    return () => {
      if (wishNode) wishNode.removeEventListener("wheel", wishWheel);
      if (orderNode) orderNode.removeEventListener("wheel", orderWheel);
    };
  }, []);

  const deleteOldImageFromCloudinary = async (url) => {
    if (!url || !url.includes("cloudinary")) return;
    try {
      const uploadIndex = url.indexOf("upload/");
      if (uploadIndex === -1) return;
      let path = url.substring(uploadIndex + 7);
      if (path.match(/^v\d+\//)) path = path.replace(/^v\d+\//, "");
      const publicId = path.lastIndexOf(".") !== -1 ? path.substring(0, path.lastIndexOf(".")) : path;
      await fetch(getApiUrl("/api/images/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });
    } catch (error) { console.error("Delete old image error:", error); }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      localStorage.removeItem("userRole");
      localStorage.removeItem("stride_admin_test_config");
      window.dispatchEvent(new Event("stride_config_updated"));
      if (window.showToast) window.showToast("Logged out successfully!", "success");
      navigate("/login");
    });
  };

  const handleDeleteAccount = async () => {
    try {
      if (dbUser.avatarUrl)
        await deleteOldImageFromCloudinary(dbUser.avatarUrl);
      localStorage.removeItem(`stride_profile_${user.uid}`);
      localStorage.removeItem(`stride_dismissed_notifs_${user.uid}`);
      localStorage.removeItem("stride_admin_test_config");
      window.dispatchEvent(new Event("stride_config_updated"));
      await deleteUser(user);
      if (window.showToast) window.showToast("Account deleted.", "success");
      navigate("/");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        if (window.showToast)
          window.showToast(
            "Please log out and log back in to delete your account.",
            "error",
          );
        setDeleteModal(false);
      }
    }
  };

  // Notif formatting
  const dismissedIds = user
    ? JSON.parse(
        localStorage.getItem(`stride_dismissed_notifs_${user.uid}`) || "[]",
      )
    : [];
  const unreadCount = notifications.filter(
    (n) => !dismissedIds.includes(n.id),
  ).length;

  const handleDismissAll = () => {
    if (!user) return;
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem(
      `stride_dismissed_notifs_${user.uid}`,
      JSON.stringify(allIds),
    );
    setNotifications([...notifications]); // trigger re-render
  };

  const getStatusBadge = (status) => {
    if (status === "Delivered" || status === "Shipped")
      return styles["badge-success"];
    if (status === "Processing") return styles["badge-warning"];
    if (status === "Pending") return styles["badge-info"];
    return styles["badge-danger"];
  };

  // Search Filtering Logic
  const filteredOrders = searchQuery.trim() ? orders.filter(o => 
    String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) || 
    (o.items && o.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())))
  ) : [];

  const fullWishlist = window.WishlistEngine ? window.WishlistEngine.get() : [];
  const filteredWishlist = searchQuery.trim() ? fullWishlist.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (w.brand && w.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];


  const initials = (dbUser.fullName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  if (authLoading) return <ProfileLoader isVisible={true} isFullPage={true} />;

  if (!user) return null;

  return (
    <>
      <div className={`${styles["user-layout"]} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
        {/* SIDEBAR */}
        <aside
          className={`${styles.sidebar} ${isSidebarOpen ? styles.active : ""} ${isSidebarCollapsed ? styles["is-collapsed"] : ""}`}
        >
          <div className={styles["sidebar-header"]}>
            <Link to="/" className={styles["sidebar-logo"]}>
              <img
                src={
                  theme === "dark"
                    ? "/images/logos/stride_logo_light.png"
                    : "/images/logos/stride_logo_dark.png"
                }
                alt="Stride"
                className={styles["sidebar-logo-img"]}
              />
            </Link>
            <div className={styles["header-actions-sidebar"]}>
              <button
                className={styles["collapse-toggle-btn"]}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <i className="bi bi-layout-sidebar"></i>
              </button>
              <button
                className={styles["mobile-close-btn"]}
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <nav className={styles["sidebar-nav"]}>
            <ul className={styles["nav-list"]}>
              <li>
                <button
                  className={`${styles["nav-link"]} ${activeView === "dashboard" ? styles.active : ""}`}
                  onClick={() => switchView("dashboard")}
                >
                  <i className="bi bi-speedometer2"></i>
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </button>
              </li>
              <li>
                <button
                  className={`${styles["nav-link"]} ${activeView === "orders" ? styles.active : ""}`}
                  onClick={() => switchView("orders")}
                >
                  <i className="bi bi-box-seam"></i>
                  {!isSidebarCollapsed && <span>My Orders</span>}
                </button>
              </li>
              <li>
                <button
                  className={`${styles["nav-link"]} ${activeView === "wishlist" ? styles.active : ""}`}
                  onClick={() => switchView("wishlist")}
                >
                  <i className="bi bi-heart"></i>
                  {!isSidebarCollapsed && <span>Wishlist</span>}
                </button>
              </li>
            </ul>
          </nav>
        </aside>
        
        {/* Mobile Sidebar Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            className={styles["sidebar-overlay"]}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* MAIN */}
        <main className={styles["main-content"]}>
          <header className={styles["top-header"]}>
            <div className={styles["header-left"]}>
              <button
                className={styles["mobile-toggle-btn"]}
                onClick={() => setIsSidebarOpen(true)}
              >
                <i className="bi bi-list"></i>
              </button>
              <div className={styles["search-bar"]} ref={searchDropdownRef}>
                <i className={`bi bi-search ${styles["search-icon"]}`}></i>
                <input
                  type="text"
                  placeholder="Search products, orders..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                />

                {isSearchOpen && searchQuery.trim() !== "" && (
                  <div className={styles["search-dropdown"]}>
                    {filteredWishlist.length === 0 && filteredOrders.length === 0 ? (
                      <div style={{ padding: "1rem", color: "var(--color-muted-fg)", textAlign: "center" }}>
                        No results found for "{searchQuery}"
                      </div>
                    ) : (
                      <>
                        {filteredWishlist.length > 0 && (
                          <div className={styles["search-dropdown-section"]}>
                            <h4>Wishlist Matches</h4>
                            {filteredWishlist.map(w => (
                              <Link 
                                to={`/product-detail?id=${w.productId || w.id.split('|')[0]}`} 
                                key={w.id} 
                                className={styles["search-item"]}
                                onClick={() => setIsSearchOpen(false)}
                              >
                                <img src={w.img} alt={w.name} />
                                <div className={styles["search-item-info"]}>
                                  <span>{w.name}</span>
                                  <span>{w.brand}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {filteredOrders.length > 0 && (
                          <div className={styles["search-dropdown-section"]}>
                            <h4>Order Matches</h4>
                            {filteredOrders.map(o => {
                              const firstItem = o.items?.[0] || { name: "Order", img: "/images/logos/stride_logo_dark.png" };
                              return (
                                <div 
                                  key={o.id} 
                                  className={styles["search-item"]}
                                  onClick={() => {
                                    setIsSearchOpen(false);
                                    switchView("orders");
                                  }}
                                >
                                  <img src={firstItem.img} alt={firstItem.name} />
                                  <div className={styles["search-item-info"]}>
                                    <span>{firstItem.name} {o.items?.length > 1 ? `+${o.items.length - 1} more` : ""}</span>
                                    <span>Order #{String(o.id).substring(0, 8).toUpperCase()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles["header-right"]}>
              <button className={styles["icon-btn"]} onClick={toggleTheme}>
                <i
                  className={`bi ${theme === "dark" ? "bi-moon" : "bi-sun"}`}
                ></i>
              </button>
              <button
                className={styles["icon-btn"]}
                onClick={() => setIsCartOpen(true)}
              >
                <i className="bi bi-cart"></i>
                {cartItems.length > 0 && (
                  <span className={styles["cart-badge"]}>
                    {cartItems.length}
                  </span>
                )}
              </button>

              <div style={{ position: "relative" }} ref={notifDropdownRef}>
                <button
                  className={styles["icon-btn"]}
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                >
                  <i className="bi bi-bell"></i>
                  {unreadCount > 0 && (
                    <span className={styles["notification-badge"]}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                <div
                  className={`${styles["notification-dropdown"]} ${isNotifDropdownOpen ? styles.active : ""}`}
                >
                  <div className={styles["dropdown-header"]}>
                    <h4>Notifications</h4>
                    <button
                      className={styles["mark-all-btn"]}
                      onClick={handleDismissAll}
                    >
                      Dismiss all
                    </button>
                  </div>
                  <div className={styles["notification-list"]}>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "1.5rem",
                          textAlign: "center",
                          color: "var(--color-muted-fg)",
                        }}
                      >
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`${styles["notification-item"]} ${dismissedIds.includes(n.id) ? styles.read : styles.unread}`}
                        >
                          <div className={styles["notif-title-row"]}>
                            <strong className={styles["notif-title"]}>
                              {n.title}
                            </strong>
                          </div>
                          <p className={styles["notif-message"]}>{n.message}</p>
                          <span className={styles["notif-date"]}>
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className={styles["header-divider"]}></div>

              <div className={styles["user-profile-header-wrapper"]}>
                <div
                  className={styles["avatar-dropdown-wrapper"]}
                  ref={avatarDropdownRef}
                >
                  <div
                    className={styles["header-avatar-wrapper"]}
                    onClick={() =>
                      setIsAvatarDropdownOpen(!isAvatarDropdownOpen)
                    }
                  >
                    <div className={styles["user-avatar"]}>
                      {dbUser.avatarUrl ? (
                        <img src={dbUser.avatarUrl} alt="Avatar" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                  <div
                    className={`${styles["avatar-dropdown-menu"]} ${isAvatarDropdownOpen ? styles.show : ""}`}
                  >
                    <button
                      className={styles["avatar-dropdown-item"]}
                      onClick={() => {
                        switchView("profile");
                        setIsAvatarDropdownOpen(false);
                      }}
                    >
                      <i className="bi bi-person-circle"></i>
                      <span>Update Profile</span>
                    </button>
                    <div className={styles["avatar-dropdown-divider"]}></div>
                    <button
                      className={`${styles["avatar-dropdown-item"]} ${styles["avatar-logout-item"]}`}
                      onClick={() => {
                        setLogoutModal(true);
                        setIsAvatarDropdownOpen(false);
                      }}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
                <div className={styles["user-info"]}>
                  <span className={styles["user-name"]}>{dbUser.fullName}</span>
                  <span className={styles["user-role"]}>Stride Member</span>
                </div>
              </div>
            </div>
          </header>

          {/* VIEWS */}
          {activeView === "dashboard" && (
            <div className={`${styles["dashboard-content"]} ${styles.active}`}>
              <div className={styles["welcome-banner"]}>
                <div className={styles["banner-content"]}>
                  <p className={styles["banner-date"]}>
                    {new Date().toLocaleDateString()}
                  </p>
                  <h1 className={styles["banner-title"]}>
                    Welcome back, {dbUser.fullName.split(" ")[0]}!
                  </h1>
                  <p className={styles["banner-subtitle"]}>
                    Always stay updated with your latest orders and drops.
                  </p>
                </div>
                <div className={styles["banner-image"]}>
                  <img
                    src="/images/backgrounds/client_dashboard_background.jpg"
                    alt="Dash"
                    className={styles["banner-graphic"]}
                  />
                </div>
              </div>

              <div className={styles["dashboard-grid"]}>
                <div className={styles["grid-main-col"]}>
                  <div className={styles["section-block"]}>
                    <div className={styles["section-header"]}>
                      <h3>Your Wishlist</h3>
                      <button
                        className={styles["see-all-link"]}
                        onClick={() => switchView("wishlist")}
                      >
                        See all
                      </button>
                    </div>
                    <div
                      className={styles["wishlist-preview-cards"]}
                      ref={wishlistScrollRef}
                    >
                      {wishlistPreview.length === 0 ? (
                        <p
                          style={{
                            color: "var(--color-muted-fg)",
                            padding: "1rem",
                          }}
                        >
                          Your wishlist is empty.
                        </p>
                      ) : (
                        wishlistPreview.map((item) => (
                          <div key={item.id} className={styles["wish-card"]}>
                            <div className={styles["card-img-wrapper"]}>
                              <img
                                src={item.image || item.img}
                                alt={item.name}
                              />
                            </div>
                            <div className={styles["card-main-info"]}>
                              <h4>{item.name}</h4>
                              <span className={styles["card-price"]}>
                                {window.formatPrice
                                  ? window.formatPrice(item.price)
                                  : `$${item.price}`}
                              </span>
                            </div>
                            <div className={styles["wish-actions"]}>
                              <button
                                className={styles["btn-outline"]}
                                onClick={() => {
                                  addToCart({
                                    id: item.productId || item.id.split("|")[0],
                                    name: item.name,
                                    price: item.price,
                                    img: item.image || item.img,
                                    brand: item.brand,
                                    size: "Standard",
                                  });
                                }}
                                style={{ width: "100%" }}
                              >
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className={styles["section-block"]}>
                    <div className={styles["section-header"]}>
                      <h3>Recent Orders</h3>
                      <button
                        className={styles["see-all-link"]}
                        onClick={() => switchView("orders")}
                      >
                        See all
                      </button>
                    </div>
                    <div
                      className={styles["orders-preview-cards"]}
                      ref={ordersScrollRef}
                    >
                      {orders.length === 0 ? (
                        <p
                          style={{
                            color: "var(--color-muted-fg)",
                            padding: "1rem",
                          }}
                        >
                          No orders found yet.
                        </p>
                      ) : (
                        orders.map((order) => {
                          const firstItem = order.items?.[0] || {
                            name: "Order Items",
                            img: "/images/logos/stride_logo_dark.png",
                          };
                          const itemName =
                            firstItem.name +
                            (order.items.length > 1
                              ? ` +${order.items.length - 1} more`
                              : "");
                          return (
                            <div
                              key={order.id}
                              className={styles["dash-order-card"]}
                            >
                              <div className={styles["card-img-wrapper"]}>
                                <img src={firstItem.img} alt={itemName} />
                              </div>
                              <div className={styles["card-main-info"]}>
                                <h4>{itemName}</h4>
                                <p>
                                  #{order.id.substring(0, 8).toUpperCase()} •{" "}
                                  {new Date(
                                    order.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className={styles["card-footer-info"]}>
                                <span className={styles["card-price"]}>
                                  {window.formatPrice
                                    ? window.formatPrice(order.total_amount)
                                    : `$${order.total_amount}`}
                                </span>
                                <span
                                  className={`${styles.badge} ${getStatusBadge(order.status)}`}
                                >
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles["grid-side-col"]}>
                  <div className={styles["section-block"]}>
                    <div className={styles["section-header"]}>
                      <h3>Support Team</h3>
                    </div>
                    <div className={styles["support-avatars"]}>
                      {["hashir", "ammara", "shoaib", "sarah"].map((name) => (
                        <div
                          key={name}
                          className={styles["support-avatar"]}
                          title={name}
                        >
                          <img
                            src={`/images/teammates/${name}.png`}
                            alt={name}
                          />
                        </div>
                      ))}
                      <button
                        className={`${styles["btn-outline"]} ${styles["w-100"]} ${styles["mt-3"]}`}
                      >
                        Chat with us
                      </button>
                    </div>
                  </div>

                  <div className={styles["section-block"]}>
                    <div className={styles["section-header"]}>
                      <h3>Latest Drops</h3>
                      <Link to="/products" className={styles["see-all-link"]}>
                        Shop now
                      </Link>
                    </div>
                    <div className={styles["news-list"]}>
                      {latestDrops.map((p) => (
                        <Link
                          to={`/product-detail?id=${p.id}`}
                          key={p.id}
                          className={styles["news-card"]}
                          style={{ textDecoration: "none", color: "inherit", display: "block" }}
                        >
                          <h4>{p.name}</h4>
                          <p>
                            Fresh arrival from {p.brand}! Available now for{" "}
                            {window.formatPrice
                              ? window.formatPrice(p.price)
                              : `$${p.price}`}
                            .
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "orders" && (
            <div className={`${styles["dashboard-content"]} ${styles.active}`}>
              <div className={styles["page-header"]}>
                <h2 className={styles["page-title"]}>My Orders</h2>
                <p className={styles["page-subtitle"]}>
                  Track, return, or view your order history.
                </p>
              </div>
              <div className={styles["full-list-container"]}>
                {orders.length === 0 ? (
                  <p
                    style={{ color: "var(--color-muted-fg)", padding: "1rem" }}
                  >
                    No orders found yet.
                  </p>
                ) : (
                  orders.map((order) => {
                    const firstItem = order.items?.[0] || {
                      name: "Order Items",
                      img: "/images/logos/stride_logo_dark.png",
                    };
                    const itemName =
                      firstItem.name +
                      (order.items.length > 1
                        ? ` +${order.items.length - 1} more`
                        : "");
                    return (
                      <div key={order.id} className={styles["dash-order-card"]}>
                        <div className={styles["card-img-wrapper"]}>
                          <img src={firstItem.img} alt={itemName} />
                        </div>
                        <div className={styles["card-main-info"]}>
                          <h4>{itemName}</h4>
                          <p>
                            #{order.id.substring(0, 8).toUpperCase()} •{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={styles["card-footer-info"]}>
                          <span className={styles["card-price"]}>
                            {window.formatPrice
                              ? window.formatPrice(order.total_amount)
                              : `$${order.total_amount}`}
                          </span>
                          <span
                            className={`${styles.badge} ${getStatusBadge(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeView === "wishlist" && (
            <div
              className={`${styles["dashboard-content"]} ${styles["view-section"]} ${styles.active}`}
            >
              <Wishlist />
            </div>
          )}

          {activeView === "profile" && (
            <div className={`${styles["dashboard-content"]} ${styles.active}`}>
            <ProfileSettings 
              user={user} 
              dbUser={dbUser} 
              setDbUser={setDbUser} 
              onDeleteAccount={() => setDeleteModal(true)}
            />
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      <div
        className={`${styles["modal-overlay"]} ${logoutModal ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLogoutModal(false);
        }}
      >
        <div className={styles["modal-content"]}>
          <h3 className={styles["modal-title"]}>Logout?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to log out of your account?
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setLogoutModal(false)}
            >
              No, Cancel
            </button>
            <button className={styles["btn-danger"]} onClick={handleLogout}>
              Yes, Logout
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles["modal-overlay"]} ${deleteModal ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDeleteModal(false);
        }}
      >
        <div className={styles["modal-content"]}>
          <h3 className={styles["modal-title"]}>Delete Account?</h3>
          <p className={styles["modal-text"]}>
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setDeleteModal(false)}
            >
              No, Cancel
            </button>
            <button
              className={styles["btn-danger"]}
              onClick={handleDeleteAccount}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
