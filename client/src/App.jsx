import React, { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useUserRole } from "./hooks/useUserRole";
import SEO from "./components/SEO/SEO";

// Components
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import Support from "./components/Layout/Support";
import Cart from "./components/ECommerce/Cart";
import Loader from "./components/UI/Loader";
import RouteLoader from "./components/UI/RouteLoader/RouteLoader";
import ErrorBoundary from "./components/UI/ErrorBoundary/ErrorBoundary";
import Notification from "./components/UI/Notification";

// Resilient Lazy Loader with auto-recovery from chunk load failures
function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn("[LazyLoader] Chunk load error, attempting auto-recovery:", error.message);
      const hasReloaded = sessionStorage.getItem("stride_lazy_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("stride_lazy_reload", "true");
        window.location.reload();
      }
      throw error;
    }
  });
}

// Lazy-Loaded Page Components
const Home = lazyWithRetry(() => import("./pages/Home"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const ShoppingCart = lazyWithRetry(() => import("./pages/ShoppingCart"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const UserDashboard = lazyWithRetry(() => import("./pages/UserDashboard"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const OrderConfirmation = lazyWithRetry(() => import("./pages/OrderConfirmation"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const ReturnExchange = lazyWithRetry(() => import("./pages/ReturnExchange"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound/NotFound"));

// Scroll To Top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Admin Protected Route Guard (Authoritative token claims only)
function AdminRouteGuard({ children }) {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return <RouteLoader />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const GLOBAL_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://stride-full-stack.vercel.app/#organization",
      "name": "Stride",
      "url": "https://stride-full-stack.vercel.app",
      "logo": "https://stride-full-stack.vercel.app/logo.png",
      "description": "Stride - Premium Athletic & Lifestyle Footwear",
      "sameAs": [
        "https://twitter.com/stridefootwear",
        "https://instagram.com/stridefootwear"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://stride-full-stack.vercel.app/#website",
      "url": "https://stride-full-stack.vercel.app",
      "name": "Stride Footwear",
      "publisher": {
        "@id": "https://stride-full-stack.vercel.app/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://stride-full-stack.vercel.app/products?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

function App() {
  const location = useLocation();

  // Excluded paths from Header/Footer
  const excludePaths = [
    "/user-dashboard",
    "/admin-dashboard",
    "/forgot-password",
    "/order-confirmation",
  ];

  const shouldShowHeaderFooter = !excludePaths.includes(location.pathname);

  // Root Theme Synchronization (Loads theme for pages without header/footer)
  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem("theme") || "light";
      if (savedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    syncTheme();

    const handleStorageChange = (e) => {
      if (e.key === "theme") {
        syncTheme();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Root Admin Test Config Cleanup (Resets sandbox testing settings for non-admin users on load)
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      localStorage.removeItem("stride_admin_test_config");
      window.dispatchEvent(new Event("stride_config_updated"));
    }
  }, []);

  // Content Protection & Download Bypasser Logic
  useEffect(() => {
    const handleContextMenu = (e) => {
      const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
      if (!config.allowContentDownload) {
        const isProtectedElement = 
          e.target.tagName === 'IMG' || 
          e.target.tagName === 'VIDEO' || 
          e.target.tagName === 'SOURCE' ||
          e.target.closest('img') || 
          e.target.closest('video');

        if (isProtectedElement) {
          e.preventDefault();
        }
      }
    };

    const handleDragStart = (e) => {
      const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
      if (!config.allowContentDownload) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return (
    <div className="App">
      <SEO jsonLd={GLOBAL_SCHEMA} />
      <Notification />

      {/* 1. Header is rendered on allowed pages */}
      {shouldShowHeaderFooter && <Header />}

      {/* Global Elements - Always available */}
      <Cart />
      {(() => {
        const [showChat, setShowChat] = React.useState(() => {
          const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
          return config.enableChatbot !== false;
        });

        React.useEffect(() => {
          const handleUpdate = () => {
            const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
            setShowChat(config.enableChatbot !== false);
          };
          window.addEventListener("stride_config_updated", handleUpdate);
          window.addEventListener("storage", handleUpdate);
          return () => {
            window.removeEventListener("stride_config_updated", handleUpdate);
            window.removeEventListener("storage", handleUpdate);
          };
        }, []);

        return showChat && location.pathname !== "/order-confirmation" ? <Support /> : null;
      })()}

      <ScrollToTop />
      <main>
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/product-detail" element={<ProductDetail />} />
              <Route path="/cart" element={<ShoppingCart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route path="/user-dashboard" element={<UserDashboard />} />
              <Route
                path="/admin-dashboard"
                element={
                  <AdminRouteGuard>
                    <AdminDashboard />
                  </AdminRouteGuard>
                }
              />

              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/returns-exchanges" element={<ReturnExchange />} />

              {/* Custom 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* 2. Footer is rendered on allowed pages */}
      {shouldShowHeaderFooter && <Footer />}
    </div>
  );
}

export default App;
