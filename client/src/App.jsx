import React from "react";
import { Routes, Route, useLocation } from "react-router-dom"; // useLocation add kiya

// Components
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import Support from "./components/Layout/Support";
import Cart from "./components/ECommerce/Cart";
import Loader from "./components/UI/Loader";
import Notification from "./components/UI/Notification";

// Pages... (saare imports wahi purane wale)
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ShoppingCart from "./pages/ShoppingCart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import OrderConfirmation from "./pages/OrderConfirmation";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ReturnExchange from "./pages/ReturnExchange";
import { useEffect } from "react";

function App() {
  const location = useLocation();

  // List banayein jin pages par Header/Footer nahi dikhana
  // Note: Path wahi likhein jo neeche <Route path="..."> mein hain
  const excludePaths = [
    "/user-dashboard",
    "/admin-dashboard",
    "/forgot-password",
    "/order-confirmation",
  ];

  const shouldShowHeaderFooter = !excludePaths.includes(location.pathname);

  // Dynamic Title Logic
  useEffect(() => {
    const titleMap = {
      "/": "Home | Stride",
      "/about": "About Us | Stride",
      "/products": "Products | Stride",
      "/product-detail": "Product Details | Stride",
      "/cart": "Your Cart | Stride",
      "/checkout": "Checkout | Stride",
      "/order-confirmation": "Order Confirmed | Stride",
      "/login": "Login | Stride",
      "/signup": "Join Stride | Stride",
      "/forgot-password": "Reset Password | Stride",
      "/user-dashboard": "My Account | Stride",
      "/admin-dashboard": "Admin Dashboard | Stride",
      "/contact": "Contact Us | Stride",
      "/faq": "FAQs | Stride",
      "/privacy-policy": "Privacy Policy | Stride",
      "/returns-exchanges": "Returns & Exchanges | Stride",
    };

    document.title = titleMap[location.pathname] || "Stride";
  }, [location.pathname]);

  return (
    <div className="App">
      <Loader />
      <Notification />

      {/* 1. Header sirf un pages par ayega jo excluded nahi hain */}
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

        return showChat ? <Support /> : null;
      })()}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product-detail" element={<ProductDetail />} />
          <Route path="/cart" element={<ShoppingCart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />

          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/returns-exchanges" element={<ReturnExchange />} />
        </Routes>
      </main>

      {/* 2. Footer bhi sirf un pages par ayega jo excluded nahi hain */}
      {shouldShowHeaderFooter && <Footer />}
    </div>
  );
}

export default App;
