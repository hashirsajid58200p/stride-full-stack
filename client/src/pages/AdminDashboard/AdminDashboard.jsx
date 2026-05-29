import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getApiUrl } from "../../utils/apiConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import styles from "./AdminDashboard.module.css";
import LiveChat from "../../components/Admin/LiveChat/LiveChat";
import ProfileSettings from "../../components/ECommerce/ProfileSettings/ProfileSettings";
import OverviewSection from "./sections/OverviewSection";
import ProductsSection from "./sections/ProductsSection";
import InventorySection from "./sections/InventorySection";
import OffersSection from "./sections/OffersSection";
import OrdersSection from "./sections/OrdersSection";
import DeliverySection from "./sections/DeliverySection";
import TestingLabSection from "./sections/TestingLabSection";
import CustomScrollbar from "../../components/UI/CustomScrollbar";
import CustomCheckbox from "../../components/UI/CustomCheckbox";


// We rely on the globally loaded Chart.js script from index.html
// as requested to maintain the exact architecture of the vanilla build.

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dwagwbklz/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

// Replicates the colorShades logic used in vanilla
const colorOptions = [
  "Default",
  "Red",
  "Blue",
  "Yellow",
  "Green",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Black",
  "White",
  "Gray",
  "Grey",
  "Maroon",
  "Crimson",
  "Scarlet",
  "Navy",
  "NavyBlue",
  "SkyBlue",
  "RoyalBlue",
  "Mustard",
  "Gold",
  "Lemon",
  "Olive",
  "Lime",
  "Emerald",
  "Coral",
  "Peach",
  "Tangerine",
  "Violet",
  "Lavender",
  "Magenta",
  "HotPink",
  "Rose",
  "Fuchsia",
  "Chocolate",
  "Tan",
  "Beige",
  "Charcoal",
  "JetBlack",
  "Ivory",
  "OffWhite",
  "Silver",
  "Slate",
];

const getColorHexFallback = (colorStr) => {
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
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "dashboard";

  // State: App & User
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState({
    fullName: "",
    email: "",
    avatarUrl: null,
    phone: "",
    postalCode: "",
    address: "",
  });
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // State: Data
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [offers, setOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // State: Analytics
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [salesDataByDate, setSalesDataByDate] = useState({});
  const [authLoading, setAuthLoading] = useState(true);
  
  // State: Testing Lab (Persistent)
  const [testConfig, setTestConfig] = useState(() => {
    const saved = localStorage.getItem("stride_admin_test_config");
    return saved ? JSON.parse(saved) : {
      allowAddToCart: false,
      allowBuyNow: false,
      allowReviews: false,
      allowWishlist: false,
      enableChatbot: true,
      enableStripeCheckout: true,
      allowContentDownload: false
    };
  });

  // State: UI & Search
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState({
    products: 1,
    offers: 1,
    inventory: 1,
    orders: 1,
    delivery: 1
  });

  const ITEMS_PER_PAGE = 10;

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(prev => ({
      ...prev,
      products: 1,
      offers: 1,
      inventory: 1,
      orders: 1,
      delivery: 1
    }));
  }, [tableSearchQuery]);

  const notifDropdownRef = useRef(null);
  const avatarDropdownRef = useRef(null);

  // Modals & Forms
  const [activeModal, setActiveModal] = useState(null); // 'product', 'delivery', 'offer', 'flash', 'sidebar', 'orderDetails', 'deleteProduct', etc.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetId, setTargetId] = useState(null);
  const [targetName, setTargetName] = useState("");

  // Sidebar Config
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sidebar Config
  const [sidebarConfig, setSidebarConfig] = useState({
    categories: ["Men", "Women", "Universal", "New Arrival"],
    brands: ["Nike", "Adidas", "Puma", "New Balance", "Jordan"],
  });
  const [newCat, setNewCat] = useState("");
  const [newBrand, setNewBrand] = useState("");

  // Chart Refs
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const scrollRef = useRef(null);

  // Form States
  const [deliveryForm, setDeliveryForm] = useState({
    id: "",
    name: "",
    cost: "",
    isFree: false,
    time: "",
  });
  const [offerForm, setOfferForm] = useState({
    type: "coupon",
    targetId: "",
    code: "",
    discount: "",
    limit: "",
    date: "",
  });
  const [flashForm, setFlashForm] = useState({
    targetId: "",
    discount: "",
    date: "",
  });

  // Product Form State (Complex)
  const [productForm, setProductForm] = useState({
    id: "",
    brand: "",
    name: "",
    desc: "",
    price: "",
    tags: "",
    standardTags: [],
  });
  const [colorBlocks, setColorBlocks] = useState([]); // [{ color: 'Red', file: null, existingUrl: '', sizes: { '7': 10, '8': 5 } }]

  // Inventory Bulk
  const [bulkStock, setBulkStock] = useState("");
  const [selectedInventory, setSelectedInventory] = useState([]);

  // ==========================================
  // INITIALIZATION & AUTH
  // ==========================================
  useEffect(() => {
    const handleAuth = (currentUser) => {
      if (currentUser) {
        const role = localStorage.getItem("userRole");
        if (role !== "admin") {
          navigate("/user-dashboard", { replace: true });
        } else {
          setUser(currentUser);

          // Initialize dbUser for profile info
          let extraData = { phone: "", address: "", postalCode: "", avatarUrl: "" };
          const extraDataStr = localStorage.getItem(
            `stride_profile_${currentUser.uid}`,
          );
          if (extraDataStr) {
            try {
              extraData = JSON.parse(extraDataStr);
            } catch (e) {
              console.error("Error parsing profile data", e);
            }
          }

          let activeAvatarUrl = extraData.avatarUrl || currentUser.photoURL || null;

          setDbUser({
            fullName:
              currentUser.displayName || extraData.fullName || "Admin User",
            email: currentUser.email || "",
            avatarUrl: activeAvatarUrl,
            phone: extraData.phone || "",
            postalCode: extraData.postalCode || "",
            address: extraData.address || "",
          });

          // Define global notification helper
          window.createNotification = async (type, title, message, relatedId = null) => {
            try {
              await window.supabase.from("platform_notifications").insert([
                {
                  type,
                  title,
                  message,
                  related_id: relatedId,
                  is_read: false,
                  created_at: new Date().toISOString(),
                },
              ]);
            } catch (err) {
              console.error("Global Notification Error:", err);
            }
          };

          const storedConfig = localStorage.getItem("stride_sidebar_filters");
          if (storedConfig) setSidebarConfig(JSON.parse(storedConfig));
        }
        setAuthLoading(false);
      } else {
        navigate("/login", { replace: true });
        setAuthLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuth);
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("stride_admin_test_config", JSON.stringify(testConfig));
    // Dispatch event so other components in the same tab (like App.jsx) can react
    window.dispatchEvent(new Event("stride_config_updated"));
  }, [testConfig]);

  // Click Outside logic to prevent crashes and handle UI cleanup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        avatarDropdownRef.current &&
        !avatarDropdownRef.current.contains(e.target)
      ) {
        setIsAvatarDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target)
      ) {
        setIsNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchData = async () => {
    if (!window.supabase) return;
    try {
      // 1. Orders
      const { data: oData } = await window.supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      let income = 0;
      let salesMap = {};
      const processedOrders = (oData || []).map((order) => {
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
        if (order.status !== "Pending" && order.status !== "Cancelled") {
          income += order.total_amount;
          const dateStr = new Date(order.created_at).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          );
          salesMap[dateStr] = (salesMap[dateStr] || 0) + order.total_amount;
        }
        return order;
      });
      setOrders(processedOrders);
      setTotalIncome(income);
      setSalesDataByDate(salesMap);

      // 2. Products & Inventory
      const { data: pData } = await window.supabase
        .from("products")
        .select(
          `*, product_colors ( color_name, image_url ), product_sizes ( size, stock_quantity )`,
        )
        .order("created_at", { ascending: false });
      let invValue = 0;
      let lowStock = 0;
      const processedProducts = (pData || []).map((p) => {
        let stock = 0;
        if (p.product_sizes) {
          stock = p.product_sizes.reduce((sum, s) => sum + s.stock_quantity, 0);
        }
        invValue += stock * p.price;
        if (stock > 0 && stock < 10) lowStock++;

        let status = "In Stock";
        if (stock === 0) status = "Out of Stock";
        else if (stock < 10) status = "Low Stock";
        return { ...p, totalStock: stock, status };
      });
      setProducts(processedProducts);
      setTotalInventoryValue(invValue);
      setLowStockCount(lowStock);

      // 3. Deliveries
      const { data: dData } = await window.supabase
        .from("delivery_options")
        .select("*")
        .order("cost", { ascending: true });
      if (dData) setDeliveries(dData);

      // 4. Offers
      const { data: offData } = await window.supabase
        .from("offers")
        .select("*, products(name)");
      if (offData) setOffers(offData);

      // 5. Notifications
      const { data: nData } = await window.supabase
        .from("platform_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (nData) setNotifications(nData);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // ==========================================
  // CHART.JS INTEGRATION
  // ==========================================
  useEffect(() => {
    if (activeView === "dashboard" && window.Chart) {
      // Line Chart
      const ctxLine = document.getElementById("salesLineChart");
      if (ctxLine) {
        if (lineChartRef.current) lineChartRef.current.destroy();
        const sortedDates = Object.keys(salesDataByDate).sort(
          (a, b) => new Date(a) - new Date(b),
        );
        const labels = sortedDates.length > 0 ? sortedDates : ["No Data Yet"];
        const vals =
          sortedDates.length > 0
            ? sortedDates.map((d) => salesDataByDate[d])
            : [0];

        lineChartRef.current = new window.Chart(ctxLine, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Daily Revenue ($)",
                data: vals,
                borderColor: "#ff6b00",
                backgroundColor: "rgba(255, 107, 0, 0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#ff6b00",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(128, 128, 128, 0.1)", drawBorder: false },
                ticks: { color: "#a3a3a3", font: { size: 11 } },
              },
              x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: "#a3a3a3", font: { size: 11 } },
              },
            },
          },
        });
      }

      // Pie Chart
      const ctxPie = document.getElementById("categoryPieChart");
      if (ctxPie) {
        if (pieChartRef.current) pieChartRef.current.destroy();
        const brandCounts = {};
        products.forEach((p) => {
          brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        });
        const labels = Object.keys(brandCounts);
        const vals = Object.values(brandCounts);
        const bgColors = [
          "#ff6b00",
          "#3b82f6",
          "#10b981",
          "#8b5cf6",
          "#f59e0b",
        ];

        pieChartRef.current = new window.Chart(ctxPie, {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [
              {
                data: vals,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: "75%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "#a3a3a3",
                  font: { size: 11 },
                  padding: 20,
                  usePointStyle: true,
                  pointStyle: "circle",
                },
              },
            },
          },
        });
      }
    }
  }, [activeView, salesDataByDate, products]);

  // ==========================================
  // HANDLERS: UI & NAVIGATION
  // ==========================================
  const switchView = (target) => {
    setSearchParams({ view: target });
    setIsSidebarOpen(false);
    setIsAvatarDropdownOpen(false);
    setSearchQuery("");
    setTableSearchQuery("");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    signOut(window.auth).then(() => {
      localStorage.removeItem("userRole");
      if (window.showToast)
        window.showToast("Logged out successfully!", "success");
      navigate("/login");
    });
  };

  const handleDeleteAccount = async () => {
    try {
      if (dbUser.avatarUrl)
        await deleteOldImageFromCloudinary(dbUser.avatarUrl);
      localStorage.removeItem(`stride_profile_${user.uid}`);
      // Remove any admin specific local storage if any
      localStorage.removeItem("stride_admin_test_config");
      
      const { deleteUser } = await import("firebase/auth");
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
        setActiveModal(null);
      }
    }
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "in stock" || s === "delivered" || s === "active" || s === "success")
      return styles["badge-success"];
    if (s === "low stock" || s === "processing" || s === "pending")
      return styles["badge-warning"];
    if (
      s === "out of stock" ||
      s === "expired" ||
      s === "inactive" ||
      s === "cancelled" ||
      s === "failed"
    )
      return styles["badge-danger"];
    if (s === "shipped") return styles["badge-info"];
    return styles["badge-neutral"] || "";
  };

  // Horizontal Scroll
  useEffect(() => {
    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > 0) return;
      if (e.deltaY !== 0 && scrollRef.current) {
        e.preventDefault();
        scrollRef.current.scrollLeft += e.deltaY;
      }
    };
    const node = scrollRef.current;
    if (node) node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      if (node) node.removeEventListener("wheel", handleWheel);
    };
  }, [activeView]);

  // ==========================================
  // CLOUDINARY
  // ==========================================
  const uploadImageToCloudinary = async (file, folderName, customName) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folderName);
    if (customName) {
      const slug = customName
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
      formData.append("public_id", slug);
    }
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
  };

  const deleteOldImageFromCloudinary = async (url) => {
    if (!url || !url.includes("cloudinary")) return;
    try {
      const uploadIndex = url.indexOf("upload/");
      if (uploadIndex === -1) return;
      let path = url.substring(uploadIndex + 7);
      if (path.match(/^v\d+\//)) path = path.replace(/^v\d+\//, "");
      const publicId =
        path.lastIndexOf(".") !== -1
          ? path.substring(0, path.lastIndexOf("."))
          : path;
      await fetch(getApiUrl("/api/images/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });
    } catch (e) {}
  };

  // ==========================================
  // HANDLERS: PRODUCT ADD/EDIT
  // ==========================================
  const handleProductModalOpen = (product = null) => {
    if (product) {
      const tags = product.tags
        ? product.tags.split(",").map((t) => t.trim())
        : [];
      const stdTags = tags.filter((t) =>
        [
          "Men",
          "Women",
          "Universal",
          "New Arrival",
          "On Sale",
          "Featured",
          "Limited Edition",
        ].includes(t),
      );
      const customTags = tags.filter(
        (t) =>
          ![
            "Men",
            "Women",
            "Universal",
            "New Arrival",
            "On Sale",
            "Featured",
            "Limited Edition",
          ].includes(t),
      );

      setProductForm({
        id: product.id,
        brand: product.brand,
        name: product.name,
        desc: product.description || "",
        price: product.price,
        tags: customTags.join(", "),
        standardTags: stdTags,
      });

      const blocks = (product.product_colors || []).map((pc) => {
        const sizeMap = {};
        [7, 8, 9, 10, 11, 12].forEach((sz) => {
          const matching = product.product_sizes?.find(
            (s) => parseInt(s.size) === sz,
          );
          if (matching) {
            // Estimate distribution across colors (Vanilla behavior)
            sizeMap[sz] = Math.floor(
              matching.stock_quantity /
                Math.max(1, product.product_colors.length),
            );
          } else {
            sizeMap[sz] = null; // Unchecked
          }
        });
        return {
          color: pc.color_name,
          file: null,
          existingUrl: pc.image_url,
          sizes: sizeMap,
        };
      });
      setColorBlocks(blocks);
    } else {
      setProductForm({
        id: "",
        brand: "",
        name: "",
        desc: "",
        price: "",
        tags: "",
        standardTags: [],
      });
      setColorBlocks([]);
    }
    setActiveModal("product");
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (colorBlocks.length === 0) {
      if (window.showToast)
        window.showToast(
          "You must add at least one color/image variant.",
          "error",
        );
      return;
    }
    setIsSubmitting(true);
    try {
      const isEdit = !!productForm.id;
      const finalTags = [...productForm.standardTags];
      if (productForm.tags)
        productForm.tags.split(",").forEach((t) => {
          if (t.trim()) finalTags.push(t.trim());
        });
      const tagsString = finalTags.join(", ");

      let mainImageUrl = "";
      let processedColors = [];

      for (let i = 0; i < colorBlocks.length; i++) {
        const block = colorBlocks[i];
        let finalUrl = "";
        if (block.file) {
          const customName = `${productForm.brand}-${productForm.name}-${block.color}`;
          finalUrl = await uploadImageToCloudinary(
            block.file,
            "stride_products",
            customName,
          );
          if (block.existingUrl)
            await deleteOldImageFromCloudinary(block.existingUrl);
        } else if (block.existingUrl) {
          finalUrl = block.existingUrl;
        } else {
          throw new Error(`Missing image for color: ${block.color}`);
        }
        if (i === 0) mainImageUrl = finalUrl;
        processedColors.push({ color_name: block.color, image_url: finalUrl });
      }

      let newProductId = productForm.id;

      if (isEdit) {
        await window.supabase
          .from("products")
          .update({
            brand: productForm.brand,
            name: productForm.name,
            description: productForm.desc,
            price: parseFloat(productForm.price),
            tags: tagsString,
            main_image_url: mainImageUrl,
          })
          .eq("id", newProductId);

        await window.supabase
          .from("product_colors")
          .delete()
          .eq("product_id", newProductId);
        await window.supabase
          .from("product_sizes")
          .delete()
          .eq("product_id", newProductId);
      } else {
        const { data, error } = await window.supabase
          .from("products")
          .insert([
            {
              brand: productForm.brand,
              name: productForm.name,
              description: productForm.desc,
              price: parseFloat(productForm.price),
              tags: tagsString,
              main_image_url: mainImageUrl,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        newProductId = data.id;

        await window.createNotification(
          "product_added",
          "New Product Alert!",
          `${productForm.name} has been added to the catalog. Check it out!`,
          newProductId // Pass the ID to link it
        );
      }

      if (processedColors.length > 0) {
        const colorInserts = processedColors.map((c) => ({
          product_id: newProductId,
          color_name: c.color_name,
          image_url: c.image_url,
        }));
        await window.supabase.from("product_colors").insert(colorInserts);
      }

      let globalSizesMap = {};
      colorBlocks.forEach((block) => {
        Object.entries(block.sizes).forEach(([size, qty]) => {
          if (qty !== null && qty !== "") {
            globalSizesMap[size] =
              (globalSizesMap[size] || 0) + parseInt(qty, 10);
          }
        });
      });

      const sizeInserts = Object.keys(globalSizesMap).map((size) => ({
        product_id: newProductId,
        size: size,
        stock_quantity: globalSizesMap[size],
      }));
      if (sizeInserts.length > 0) {
        await window.supabase.from("product_sizes").insert(sizeInserts);
      }

      if (window.showToast)
        window.showToast(
          `Product successfully ${isEdit ? "updated" : "added"}!`,
          "success",
        );
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast) window.showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductDelete = async () => {
    setIsSubmitting(true);
    try {
      const { data: productColors } = await window.supabase
        .from("product_colors")
        .select("image_url")
        .eq("product_id", targetId);
      if (productColors) {
        for (let pc of productColors)
          await deleteOldImageFromCloudinary(pc.image_url);
      }
      await window.supabase.from("products").delete().eq("id", targetId);
      
      // Auto-delete related notifications
      await window.supabase.from("platform_notifications").delete().eq("related_id", targetId);

      if (window.showToast)
        window.showToast("Product permanently deleted.", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to delete product.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color Blocks Handlers
  const addColorBlock = (color) => {
    if (colorBlocks.some((b) => b.color === color)) {
      // Toggle off: remove the color block
      setColorBlocks((prev) => prev.filter((b) => b.color !== color));
      return;
    }
    const defaultSizes = { 7: "100", 8: "100", 9: "100", 10: "100", 11: "100", 12: "100" };
    setColorBlocks((prev) => [
      ...prev,
      { color, file: null, existingUrl: "", sizes: defaultSizes },
    ]);
  };

  const updateColorBlockFile = (index, file) => {
    const newBlocks = [...colorBlocks];
    newBlocks[index].file = file;
    setColorBlocks(newBlocks);
  };

  const updateColorBlockSize = (blockIndex, size, value) => {
    const newBlocks = [...colorBlocks];
    newBlocks[blockIndex].sizes[size] = value === false ? null : value; // false implies unchecked
    setColorBlocks(newBlocks);
  };

  // ==========================================
  // HANDLERS: DELIVERY OPTIONS
  // ==========================================
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cost = deliveryForm.isFree ? 0 : parseFloat(deliveryForm.cost);
      if (deliveryForm.id) {
        await window.supabase
          .from("delivery_options")
          .update({
            name: deliveryForm.name,
            cost,
            estimated_time: deliveryForm.time,
          })
          .eq("id", deliveryForm.id);
      } else {
        await window.supabase
          .from("delivery_options")
          .insert([
            {
              name: deliveryForm.name,
              cost,
              estimated_time: deliveryForm.time,
              status: "Active",
            },
          ]);
      }
      if (window.showToast)
        window.showToast(
          deliveryForm.id
            ? "Delivery Option Updated!"
            : "Delivery Option Added!",
          "success",
        );
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to save delivery option.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliveryDelete = async () => {
    setIsSubmitting(true);
    try {
      await window.supabase
        .from("delivery_options")
        .delete()
        .eq("id", targetId);
      if (window.showToast)
        window.showToast("Delivery option deleted.", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to delete option.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: OFFERS
  // ==========================================
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Get the newly created offer ID (insert doesn't return data by default in some Supabase versions, using select() just in case)
      const { data: newOffer } = await window.supabase.from("offers").insert([
        {
          type: offerForm.type,
          target_product_id:
            offerForm.type === "product" ? offerForm.targetId : null,
          code: offerForm.code,
          discount_percentage: parseFloat(offerForm.discount),
          usage_limit: offerForm.limit ? parseInt(offerForm.limit) : null,
          valid_until: offerForm.date,
          status: "Active",
        },
      ]).select().single();

      await window.createNotification(
        "offer_created",
        "New Coupon Created!",
        `A new coupon (${offerForm.code}) has been created giving ${offerForm.discount}% OFF!`,
        newOffer ? newOffer.id : null
      );
      if (window.showToast)
        window.showToast("Coupon Created Successfully!", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to create coupon.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlashSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const generatedCode = "SALE-" + Date.now();
      const { data: flashOffer } = await window.supabase.from("offers").insert([
        {
          type: "flash_sale",
          target_product_id: flashForm.targetId || null,
          code: generatedCode,
          discount_percentage: parseFloat(flashForm.discount),
          usage_limit: null,
          valid_until: flashForm.date,
          status: "Active",
        },
      ]).select().single();

      await window.createNotification(
        "offer_created",
        "Flash Sale Activated!",
        `A Flash Sale has been created giving ${flashForm.discount}% OFF for the next few days!`,
        flashOffer ? flashOffer.id : null
      );
      if (window.showToast)
        window.showToast("Flash Sale Activated Successfully!", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to create Flash Sale.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfferDelete = async () => {
    setIsSubmitting(true);
    try {
      await window.supabase.from("offers").delete().eq("id", targetId);
      
      // Auto-delete related notifications
      await window.supabase.from("platform_notifications").delete().eq("related_id", targetId);

      if (window.showToast) window.showToast("Offer deleted.", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to delete offer.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: INVENTORY
  // ==========================================
  const handleInventoryCheck = (pid, size) => {
    const key = `${pid}|${size}`;
    setSelectedInventory((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleInventorySelectAll = (e) => {
    if (e.target.checked) {
      const allKeys = [];
      products.forEach((p) =>
        p.product_sizes?.forEach((s) => allKeys.push(`${p.id}|${s.size}`)),
      );
      setSelectedInventory(allKeys);
    } else {
      setSelectedInventory([]);
    }
  };

  const handleBulkUpdate = async () => {
    const amount = parseInt(bulkStock, 10);
    if (isNaN(amount) || amount < 0) {
      if (window.showToast)
        window.showToast("Please enter a valid stock quantity.", "error");
      return;
    }
    if (selectedInventory.length === 0) {
      if (window.showToast)
        window.showToast("Please select at least one item to update.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      for (let key of selectedInventory) {
        const [pid, size] = key.split("|");
        await window.supabase
          .from("product_sizes")
          .update({ stock_quantity: amount })
          .eq("product_id", pid)
          .eq("size", size);
      }
      if (window.showToast)
        window.showToast(
          `Successfully updated stock for ${selectedInventory.length} items!`,
          "success",
        );
      await window.createNotification(
        "restock",
        "Inventory Restocked",
        `Multiple product variations have been restocked. Check them out!`,
      );
      setBulkStock("");
      setSelectedInventory([]);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to update stock.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleStockUpdate = async (pid, size, elementId) => {
    const input = document.getElementById(elementId);
    const amount = parseInt(input.value, 10);
    if (isNaN(amount) || amount < 0) return;
    try {
      await window.supabase
        .from("product_sizes")
        .update({ stock_quantity: amount })
        .eq("product_id", pid)
        .eq("size", size);
      if (window.showToast)
        window.showToast(
          `Stock updated to ${amount} for Size ${size}!`,
          "success",
        );
      input.value = "";
      const prod = products.find((p) => p.id === pid);
        await window.createNotification(
          "restock",
          "Product Restocked",
          `${prod.name} has been restocked. Check it out!`,
          pid
        );
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to update stock.", "error");
    }
  };

  const handleMarkEmpty = async (pid, size) => {
    try {
      await window.supabase
        .from("product_sizes")
        .update({ stock_quantity: 0 })
        .eq("product_id", pid)
        .eq("size", size);
      if (window.showToast)
        window.showToast(`Marked Size ${size} as Out of Stock.`, "success");
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to mark out of stock.", "error");
    }
  };

  // ==========================================
  // HANDLERS: ORDERS
  // ==========================================
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      await window.supabase
        .from("orders")
        .update({ status: newStatus, is_manual_override: true })
        .eq("id", orderId);
      if (window.showToast)
        window.showToast(`Order manually updated to ${newStatus}.`, "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to update status.", "error");
    }
  };

  const handleOrderDelete = async () => {
    setIsSubmitting(true);
    try {
      await window.supabase.from("orders").delete().eq("id", targetId);
      if (window.showToast)
        window.showToast("Order permanently deleted.", "success");
      setActiveModal(null);
      fetchData();
    } catch (err) {
      if (window.showToast)
        window.showToast("Failed to delete order.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SIDEBAR DRAG & DROP LOGIC
  // ==========================================
  const onDragStart = (e, index, type) => {
    e.dataTransfer.setData("index", index);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, targetIndex, type) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("index"), 10);
    const sourceType = e.dataTransfer.getData("type");
    if (sourceType !== type || sourceIndex === targetIndex) return;

    const newList =
      type === "category"
        ? [...sidebarConfig.categories]
        : [...sidebarConfig.brands];
    const [movedItem] = newList.splice(sourceIndex, 1);
    newList.splice(targetIndex, 0, movedItem);

    setSidebarConfig((prev) => ({
      ...prev,
      [type === "category" ? "categories" : "brands"]: newList,
    }));
  };

  const saveSidebarSettings = () => {
    localStorage.setItem(
      "stride_sidebar_filters",
      JSON.stringify(sidebarConfig),
    );
    if (window.showToast)
      window.showToast("Sidebar configuration saved!", "success");
    setActiveModal(null);
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const deleteNotification = async (id) => {
    if (!window.supabase) return;
    try {
      const { error } = await window.supabase
        .from("platform_notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setNotifications(notifications.filter((n) => n.id !== id));
      window.showToast("Notification deleted", "success");
    } catch (err) {
      console.error("Delete Notification Error:", err);
      window.showToast("Failed to delete notification", "error");
    }
  };

  const editNotification = (id) => {
    window.showToast("Notification editing is coming soon!", "info");
  };


  const getPageTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Overview";
      case "products":
        return "Product Inventory";
      case "offers":
        return "Offers & Discounts";
      case "inventory":
        return "Inventory Management";
      case "orders":
        return "Recent Orders";
      case "delivery":
        return "Delivery Options";
      case "profile":
        return "Personal Information";
      case "live-chat":
        return "Live Chat";
      case "testing":
        return "Testing Lab";
      default:
        return "Admin Dashboard";
    }
  };

  const getPageSubtitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Monitor your store's performance metrics.";
      case "products":
        return "Manage your catalog, pricing, and stock.";
      case "offers":
        return "Manage coupons and flash sales.";
      case "inventory":
        return "Select and restock specific product sizes.";
      case "orders":
        return "Track and update customer fulfillment.";
      case "delivery":
        return "Manage shipping methods and costs.";
      case "profile":
        return "Update your account details and security preferences.";
      case "live-chat":
        return "Connect with your customers in real-time.";
      case "testing":
        return "Configure sandbox restrictions for administrative testing.";
      default:
        return "";
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          color: "var(--color-fg)",
          fontSize: "1.2rem",
          fontWeight: "600",
        }}
      >
        <div className={styles["spinner"]}></div>
        <span style={{ marginLeft: "1rem" }}>Initializing Admin Panel...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <React.Fragment>
      <div className={`${styles["admin-layout"]} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
        {/* SIDEBAR */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ""} ${isSidebarCollapsed ? styles["is-collapsed"] : ""}`} id="sidebar">
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
                id="sidebar-logo"
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
                id="closeSidebar"
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <nav className={styles["sidebar-nav"]}>
            <ul className={styles["nav-list"]}>
              {[
                { id: "dashboard", icon: "speedometer2", label: "Dashboard" },
                { id: "products", icon: "box-seam", label: "Products" },
                { id: "offers", icon: "tags", label: "Offers" },
                { id: "inventory", icon: "boxes", label: "Inventory" },
                { id: "orders", icon: "cart-check", label: "Orders" },
                { id: "delivery", icon: "truck", label: "Delivery" },
                { id: "live-chat", icon: "chat-dots", label: "Live Chat" },
                { id: "testing", icon: "flask", label: "Testing Lab" },
              ].map((item) => (
                <li className={styles["nav-item"]} key={item.id}>
                  <button
                    className={`${styles["nav-link"]} ${activeView === item.id ? styles.active : ""}`}
                    onClick={() => switchView(item.id)}
                  >
                    {item.id === "testing" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <path d="M4.5 0a.5.5 0 0 0 0 1H5v5.36L.503 13.717A1.5 1.5 0 0 0 1.783 16h12.434a1.5 1.5 0 0 0 1.28-2.282L11 6.359V1h.5a.5.5 0 0 0 0-1zM10 2H9a.5.5 0 0 0 0 1h1v1H9a.5.5 0 0 0 0 1h1v1H9a.5.5 0 0 0 0 1h1.22l.61 1H10a.5.5 0 1 0 0 1h1.442l.611 1H11a.5.5 0 1 0 0 1h1.664l.611 1H12a.5.5 0 1 0 0 1h1.886l.758 1.24a.5.5 0 0 1-.427.76H1.783a.5.5 0 0 1-.427-.76l4.57-7.48A.5.5 0 0 0 6 6.5V1h4z"/>
                      </svg>
                    ) : (
                      <i className={item.id === "testing" ? "bi bi-flask" : `bi bi-${item.icon}`}></i>
                    )}
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className={styles["main-content"]}>
          <header className={styles["top-header"]}>
            <div className={styles["header-left"]}>
              <button
                className={styles["mobile-toggle-btn"]}
                id="openSidebar"
                onClick={() => setIsSidebarOpen(true)}
              >
                <i className="bi bi-list"></i>
              </button>
              <div 
                className={styles["header-datetime"]}
                onClick={() => setIs24Hour(!is24Hour)}
                style={{ cursor: "pointer" }}
                title={`Switch to ${is24Hour ? "12h" : "24h"} format`}
              >
                <span className={styles["header-date"]}>
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className={styles["header-time"]}>
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: !is24Hour,
                  })}
                </span>
              </div>
            </div>

            <div className={styles["header-right"]}>

              <button
                className={`${styles["action-btn"]} ${styles["icon-btn"]}`}
                id="themeToggle"
                aria-label="Toggle Theme"
                onClick={toggleTheme}
              >
                <i
                  className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon"}`}
                ></i>
              </button>

              <div style={{ position: "relative" }}>
                <button
                  className={`${styles["action-btn"]} ${styles["icon-btn"]}`}
                  id="notification-bell-btn"
                  aria-label="Notifications"
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  ref={notifDropdownRef}
                >
                  <i className="bi bi-bell"></i>
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <span
                      className={styles["notification-badge"]}
                      id="notification-badge-count"
                    >
                      {notifications.filter((n) => !n.is_read).length}
                    </span>
                  )}
                </button>

                <div
                  className={`${styles["notification-dropdown"]} ${isNotifDropdownOpen ? styles.active : ""}`}
                  id="notification-dropdown"
                >
                  <div className={styles["dropdown-header"]}>
                    <h4>Notifications</h4>
                    <button
                      className={`${styles["text-muted"]} ${styles["mark-all-btn"]}`}
                      id="mark-all-read-btn"
                      onClick={() =>
                        setNotifications(
                          notifications.map((n) => ({ ...n, is_read: true })),
                        )
                      }
                    >
                      Mark all read
                    </button>
                  </div>
                  <div
                    className={styles["notification-list"]}
                    id="notification-list-container"
                  >
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "var(--color-muted-fg)",
                        }}
                      >
                        No notifications found.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`${styles["notification-item"]} ${n.is_read ? styles.read : styles.unread}`}
                        >
                          <div className={styles["notif-title-row"]}>
                            <strong className={styles["notif-title"]}>
                              {n.title}
                            </strong>
                            <div className={styles["notif-actions"]}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editNotification(n.id);
                                }}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className={styles["btn-delete"]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n.id);
                                }}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
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
                  id="avatar-dropdown-wrapper"
                  onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                  ref={avatarDropdownRef}
                >
                  <div
                    className={styles["header-avatar-wrapper"]}
                    id="header-avatar-btn"
                    title="Account Options"
                  >
                    <div className={styles["user-avatar"]} id="header-avatar-content">
                      {dbUser.avatarUrl ? (
                        <img
                          src={dbUser.avatarUrl}
                          alt="Avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <span id="preview-initials" style={{ fontSize: "1rem", fontWeight: "bold" }}>
                          {dbUser.fullName
                            ? dbUser.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "A"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`${styles["avatar-dropdown-menu"]} ${isAvatarDropdownOpen ? styles.show : ""}`}
                    id="avatar-dropdown-menu"
                  >
                    <button
                      className={styles["avatar-dropdown-item"]}
                      id="avatar-profile-link"
                      onClick={() => {
                        switchView("profile");
                      }}
                    >
                      <i className="bi bi-person-circle"></i>
                      <span>Update Profile</span>
                    </button>
                    <div className={styles["avatar-dropdown-divider"]}></div>
                    <button
                      className={`${styles["avatar-dropdown-item"]} ${styles["avatar-logout-item"]}`}
                      id="avatar-logout-btn"
                      onClick={() => {
                        setActiveModal("logout");
                        setIsAvatarDropdownOpen(false);
                      }}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
                <div className={styles["user-info"]}>
                  <span className={`${styles["user-name"]} ${styles["static-text"]}`} id="header-user-name">
                    {dbUser.fullName}
                  </span>
                  <span className={`${styles["user-role"]} ${styles["static-text"]}`}>Super Admin</span>
                </div>
              </div>
            </div>
          </header>

          <div className={styles["dashboard-content"]}>
            <div className={styles["page-header"]}>
              <h2 className={styles["page-title"]}>{getPageTitle()}</h2>
              <p className={styles["page-subtitle"]}>{getPageSubtitle()}</p>
            </div>

            {/* DASHBOARD VIEW */}
            {activeView === "dashboard" && (
              <OverviewSection 
                styles={styles}
                totalInventoryValue={totalInventoryValue}
                products={products}
                lowStockCount={lowStockCount}
                offers={offers}
                totalIncome={totalIncome}
                scrollRef={scrollRef}
                switchView={switchView}
              />
            )}

            {activeView === "products" && (
              <ProductsSection 
                styles={styles}
                products={products}
                tableSearchQuery={tableSearchQuery}
                setTableSearchQuery={setTableSearchQuery}
                currentPage={currentPage.products}
                setCurrentPage={(p) => setCurrentPage(prev => ({ ...prev, products: p }))}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                handleProductModalOpen={handleProductModalOpen}
                setTargetId={setTargetId}
                setTargetName={setTargetName}
                setActiveModal={setActiveModal}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeView === "inventory" && (
              <InventorySection 
                styles={styles}
                products={products}
                tableSearchQuery={tableSearchQuery}
                setTableSearchQuery={setTableSearchQuery}
                currentPage={currentPage.inventory}
                setCurrentPage={(p) => setCurrentPage(prev => ({ ...prev, inventory: p }))}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                selectedInventory={selectedInventory}
                handleInventoryCheck={handleInventoryCheck}
                handleInventorySelectAll={handleInventorySelectAll}
                bulkStock={bulkStock}
                setBulkStock={setBulkStock}
                handleBulkUpdate={handleBulkUpdate}
                isSubmitting={isSubmitting}
                handleSingleStockUpdate={handleSingleStockUpdate}
                handleMarkEmpty={handleMarkEmpty}
              />
            )}

            {activeView === "offers" && (
              <OffersSection 
                styles={styles}
                offers={offers}
                currentPage={currentPage.offers}
                setCurrentPage={(p) => setCurrentPage(prev => ({ ...prev, offers: p }))}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                setFlashForm={setFlashForm}
                setOfferForm={setOfferForm}
                setActiveModal={setActiveModal}
                setTargetId={setTargetId}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeView === "orders" && (
              <OrdersSection 
                styles={styles}
                orders={orders}
                tableSearchQuery={tableSearchQuery}
                setTableSearchQuery={setTableSearchQuery}
                currentPage={currentPage.orders}
                setCurrentPage={(p) => setCurrentPage(prev => ({ ...prev, orders: p }))}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                setTargetId={setTargetId}
                setActiveModal={setActiveModal}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeView === "delivery" && (
              <DeliverySection 
                styles={styles}
                deliveries={deliveries}
                tableSearchQuery={tableSearchQuery}
                setTableSearchQuery={setTableSearchQuery}
                currentPage={currentPage.delivery}
                setCurrentPage={(p) => setCurrentPage(prev => ({ ...prev, delivery: p }))}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                setDeliveryForm={setDeliveryForm}
                setActiveModal={setActiveModal}
                setTargetId={setTargetId}
              />
            )}

            {activeView === "live-chat" && (
              <div className={styles["view-section"]} style={{ display: "block" }}>
                <LiveChat />
              </div>
            )}

            {activeView === "testing" && (
              <TestingLabSection 
                styles={styles}
                testConfig={testConfig}
                setTestConfig={setTestConfig}
              />
            )}

            {activeView === "profile" && (
              <ProfileSettings 
                user={user} 
                dbUser={dbUser} 
                setDbUser={setDbUser} 
                onDeleteAccount={() => setActiveModal("deleteAccount")}
              />
            )}
          </div>
        </main>
      </div>

      {/* ==========================================
          MODALS
          ========================================== */}

      <datalist id="brand-list">
        {Array.from(new Set(products.map((p) => p.brand))).map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      {/* Product Add/Edit Modal */}
      {/* Product Add/Edit Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "product" ? styles.active : ""}`}
        id="productModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} id="productModalTitle" style={{ margin: 0 }}>
              {productForm.id ? "Edit Product" : "Add New Product"}
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-form"]}>
            <CustomScrollbar>
              <form onSubmit={handleProductSubmit} style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Product Brand</label>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      required
                      value={productForm.brand}
                      onChange={(e) =>
                        setProductForm({ ...productForm, brand: e.target.value })
                      }
                      placeholder="e.g. Nike, Adidas"
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Product Name</label>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      required
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      placeholder="e.g. Air Max 270"
                    />
                  </div>
                </div>

                <div className={styles["form-group"]}>
                  <label>Product Description</label>
                  <textarea
                    className={styles["form-input"]}
                    required
                    rows="3"
                    value={productForm.desc}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        desc: e.target.value,
                      })
                    }
                    placeholder="Enter product details..."
                  ></textarea>
                </div>

                <div className={styles["form-group"]}>
                  <label>Available Colors & Images</label>
                  <div className={styles["color-checkbox-group"]}>
                    {colorOptions.map((color) => (
                      <div key={color} className={styles["color-swatch-item"]}>
                        <input
                          type="checkbox"
                          id={`color-${color}`}
                          className={styles["color-input"]}
                          checked={colorBlocks.some((b) => b.color === color)}
                          onChange={() => addColorBlock(color)}
                        />
                        <label
                          htmlFor={`color-${color}`}
                          className={`${styles.swatch} ${styles[`color-${color.toLowerCase().replace(/\s/g, "")}`]} ${color === "Default" ? styles["swatch-default"] : ""}`}
                          style={{
                            backgroundColor: getColorHexFallback(color),
                          }}
                          title={color}
                        >
                          {color === "Default" && (
                            <span className={styles["def-text"]}>Default</span>
                          )}
                          <i className="bi bi-check"></i>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className={styles["dynamic-uploads"]}>
                    {colorBlocks.map((block, bIdx) => (
                      <div key={bIdx} className={styles["color-block"]}>
                        <div className={styles["color-block-header"]}>
                          <div className={styles["color-block-title"]}>
                            <div
                              className={styles["color-indicator-dot"]}
                              style={{
                                backgroundColor: getColorHexFallback(block.color),
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                display: 'inline-block',
                                marginRight: '8px'
                              }}
                            ></div>
                            <span>{block.color} Variant</span>
                          </div>
                          <button
                            type="button"
                            className={styles["remove-color-btn"]}
                            onClick={() => setColorBlocks(prev => prev.filter((_, i) => i !== bIdx))}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>

                        <div className={styles["color-image-upload-area"]}>
                          <input
                            type="file"
                            accept="image/*"
                            className={styles["color-file-input"]}
                            onChange={(e) =>
                              updateColorBlockFile(bIdx, e.target.files[0])
                            }
                          />
                          {(block.file || block.existingUrl) && (
                            <img
                              src={
                                block.file
                                  ? URL.createObjectURL(block.file)
                                  : block.existingUrl
                              }
                              alt="Preview"
                              className={styles["color-preview-img"]}
                              style={{ display: 'block' }}
                            />
                          )}
                        </div>

                        <div className={styles["size-qty-section"]}>
                          <label style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>
                            Stock for {block.color}
                          </label>
                          <div className={styles["size-qty-grid"]}>
                            {["7", "8", "9", "10", "11", "12"].map((sz) => {
                              const isChecked = block.sizes[sz] !== null && block.sizes[sz] !== false;
                              return (
                                <div key={sz} className={styles["size-row"]}>
                                  <CustomCheckbox
                                    id={`size-${bIdx}-${sz}`}
                                    label={`Size ${sz}`}
                                    checked={isChecked}
                                    onChange={(e) =>
                                      updateColorBlockSize(
                                        bIdx,
                                        sz,
                                        e.target.checked ? "100" : false,
                                      )
                                    }
                                  />
                                  <input
                                    type="number"
                                    className={styles["qty-input"]}
                                    placeholder="Qty"
                                    min="0"
                                    value={block.sizes[sz] || ""}
                                    onChange={(e) =>
                                      updateColorBlockSize(bIdx, sz, e.target.value)
                                    }
                                    disabled={!isChecked}
                                    required={isChecked}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Primary Tags</label>
                    <div className={styles["standard-tags-group"]} style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {["Men", "Women", "Universal", "New Arrival", "On Sale", "Featured", "Limited Edition"].map((tag) => (
                        <CustomCheckbox
                          key={tag}
                          id={`tag-${tag}`}
                          label={tag}
                          checked={productForm.standardTags.includes(tag)}
                          onChange={(e) => {
                            const newTags = e.target.checked
                              ? [...productForm.standardTags, tag]
                              : productForm.standardTags.filter((t) => t !== tag);
                            // Radio behavior for gender tags
                            const genderTags = ["Men", "Women", "Universal"];
                            let filtered = newTags;
                            if (e.target.checked && genderTags.includes(tag)) {
                              filtered = newTags.filter((t) => !genderTags.includes(t) || t === tag);
                            }
                            setProductForm({ ...productForm, standardTags: filtered });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Additional Tags</label>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      value={productForm.tags}
                      onChange={(e) =>
                        setProductForm({ ...productForm, tags: e.target.value })
                      }
                      placeholder="e.g. Running, Lifestyle, Retro"
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Base Price ($)</label>
                    <input
                      type="number"
                      className={styles["form-input"]}
                      step="0.01"
                      min="0"
                      required
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, price: e.target.value })
                      }
                      placeholder="149.99"
                    />
                  </div>
                </div>

                <div className={styles["modal-footer"]} style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className={`${styles["btn-primary"]} ${styles["full-width"]}`}
                    id="submitProductBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : productForm.id ? "Update Product" : "Publish Product"}
                  </button>
                </div>
              </form>
            </CustomScrollbar>
          </div>
        </div>
      </div>

      {/* Delete Modals */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "deleteProduct" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
        >
          <h3 className={styles["modal-title"]}>Delete Product?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to permanently delete{" "}
            <span style={{ fontWeight: 700, color: "var(--color-fg)" }}>
              {targetName}
            </span>
            ? This action cannot be undone.
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
            >
              Cancel
            </button>
            <button
              className={styles["btn-danger"]}
              onClick={handleProductDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles["modal-overlay"]} ${activeModal === "deleteOrder" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
        >
          <h3 className={styles["modal-title"]}>Delete Order?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to permanently delete this order? This action
            cannot be undone.
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
            >
              Cancel
            </button>
            <button
              className={styles["btn-danger"]}
              onClick={handleOrderDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles["modal-overlay"]} ${activeModal === "deleteDelivery" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
        >
          <h3 className={styles["modal-title"]}>Delete Option?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to permanently delete this delivery option?
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
            >
              Cancel
            </button>
            <button
              className={styles["btn-danger"]}
              onClick={handleDeliveryDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles["modal-overlay"]} ${activeModal === "deleteOffer" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
        >
          <h3 className={styles["modal-title"]}>Delete Offer?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to permanently delete this offer? It will be
            removed immediately.
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
            >
              Cancel
            </button>
            <button
              className={styles["btn-danger"]}
              onClick={handleOfferDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "logout" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className={styles["modal-title"]}>Logout?</h3>
          <p className={styles["modal-text"]}>
            Are you sure you want to log out of your account?
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
            >
              No, Cancel
            </button>
            <button className={styles["btn-danger"]} onClick={handleLogout}>
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
      {/* Delete Account Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "deleteAccount" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div
          className={`${styles["modal-content"]} ${styles["modal-sm"]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className={styles["modal-title"]}>Delete Account?</h3>
          <p className={styles["modal-text"]}>
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <div className={styles["modal-actions"]}>
            <button
              className={styles["btn-outline"]}
              onClick={() => setActiveModal(null)}
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

      {/* Delivery Form Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "delivery" ? styles.active : ""}`}
        id="deliveryModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} id="delivery-modal-title" style={{ margin: 0 }}>
              {deliveryForm.id ? "Edit Delivery Option" : "Add Delivery Option"}
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-form"]}>
            <CustomScrollbar>
              <form onSubmit={handleDeliverySubmit} style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <div className={styles["form-group"]}>
                  <label>Method Name</label>
                  <input
                    type="text"
                    className={styles["form-input"]}
                    required
                    value={deliveryForm.name}
                    onChange={(e) =>
                      setDeliveryForm({ ...deliveryForm, name: e.target.value })
                    }
                    placeholder="e.g. Express Delivery"
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Cost
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "normal", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        id="delivery-is-free-react"
                        style={{ width: "auto", cursor: "pointer" }}
                        checked={deliveryForm.isFree}
                        onChange={(e) =>
                          setDeliveryForm({
                            ...deliveryForm,
                            isFree: e.target.checked,
                            cost: e.target.checked ? "0" : "",
                          })
                        }
                      />
                      <label htmlFor="delivery-is-free-react" style={{ margin: 0, cursor: "pointer", textTransform: "none" }}>Set as Free</label>
                    </div>
                  </label>
                  <input
                    type="number"
                    className={styles["form-input"]}
                    required={!deliveryForm.isFree}
                    disabled={deliveryForm.isFree}
                    step="0.01"
                    min="0"
                    value={deliveryForm.cost}
                    onInput={(e) => { if(e.target.value < 0) e.target.value = 0; }}
                    onChange={(e) =>
                      setDeliveryForm({ ...deliveryForm, cost: e.target.value })
                    }
                    placeholder="e.g. 15.00"
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label>Estimated Time</label>
                  <input
                    type="text"
                    className={styles["form-input"]}
                    required
                    value={deliveryForm.time}
                    onChange={(e) =>
                      setDeliveryForm({ ...deliveryForm, time: e.target.value })
                    }
                    placeholder="e.g. 1-2 Business Days"
                  />
                </div>
                <div className={styles["modal-footer"]} style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className={`${styles["btn-primary"]} ${styles["full-width"]}`}
                    id="submitDeliveryBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Save Delivery Option"}
                  </button>
                </div>
              </form>
            </CustomScrollbar>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "offer" ? styles.active : ""}`}
        id="offerModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} style={{ margin: 0 }}>
              Create New Coupon
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-form"]}>
            <CustomScrollbar>
              <form onSubmit={handleOfferSubmit} style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <div className={styles["form-group"]}>
                  <label>Coupon Type</label>
                  <select
                    className={`${styles["form-input"]} ${styles["custom-select-arrow"]}`}
                    value={offerForm.type}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, type: e.target.value })
                    }
                  >
                    <option value="coupon">General Cart Coupon</option>
                    <option value="product">Specific Product Coupon</option>
                  </select>
                </div>
                {offerForm.type === "product" && (
                  <div className={styles["form-group"]}>
                    <label>Select Target Product</label>
                    <select
                      className={`${styles["form-input"]} ${styles["custom-select-arrow"]}`}
                      required
                      value={offerForm.targetId}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, targetId: e.target.value })
                      }
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={styles["form-group"]}>
                  <label>Coupon Code</label>
                  <input
                    type="text"
                    className={styles["form-input"]}
                    required
                    value={offerForm.code}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, code: e.target.value })
                    }
                    placeholder="e.g. SUMMER24"
                  />
                </div>
                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Discount Percentage (%)</label>
                    <input
                      type="number"
                      className={styles["form-input"]}
                      required
                      min="1"
                      max="100"
                      value={offerForm.discount}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, discount: e.target.value })
                      }
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Usage Limit</label>
                    <input
                      type="number"
                      className={styles["form-input"]}
                      min="1"
                      value={offerForm.limit}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, limit: e.target.value })
                      }
                      placeholder="e.g. 100"
                    />
                  </div>
                </div>
                <div className={styles["form-group"]}>
                  <label>Valid Until</label>
                  <input
                    type="date"
                    className={styles["form-input"]}
                    required
                    value={offerForm.date}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, date: e.target.value })
                    }
                  />
                </div>
                <div className={styles["modal-footer"]} style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className={`${styles["btn-primary"]} ${styles["full-width"]}`}
                    id="submitOfferBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Create Coupon"}
                  </button>
                </div>
              </form>
            </CustomScrollbar>
          </div>
        </div>
      </div>

      {/* Flash Sale Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "flash" ? styles.active : ""}`}
        id="flashSaleModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} style={{ margin: 0 }}>
              Create Flash Sale
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-form"]}>
            <CustomScrollbar>
              <form onSubmit={handleFlashSubmit} style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <div className={styles["form-group"]}>
                  <label>Target Product</label>
                  <select
                    className={`${styles["form-input"]} ${styles["custom-select-arrow"]}`}
                    required
                    value={flashForm.targetId}
                    onChange={(e) =>
                      setFlashForm({ ...flashForm, targetId: e.target.value })
                    }
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Discount Percentage (%)</label>
                    <input
                      type="number"
                      className={styles["form-input"]}
                      required
                      min="1"
                      max="100"
                      value={flashForm.discount}
                      onChange={(e) =>
                        setFlashForm({ ...flashForm, discount: e.target.value })
                      }
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Valid Until</label>
                    <input
                      type="date"
                      className={styles["form-input"]}
                      required
                      value={flashForm.date}
                      onChange={(e) =>
                        setFlashForm({ ...flashForm, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className={styles["modal-footer"]} style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className={`${styles["btn-primary"]} ${styles["full-width"]}`}
                    id="submitFlashBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Create Flash Sale"}
                  </button>
                </div>
              </form>
            </CustomScrollbar>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "orderDetails" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} style={{ margin: 0 }}>
              Order Details
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          {(() => {
            const order = orders.find((o) => o.id === targetId);
            if (!order) return null;
            return (
              <div className={styles["modal-form"]}>
                <CustomScrollbar>
                  <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                    <div className={styles["order-details-grid"]}>
                      <div
                        style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                      >
                        <div
                          className={styles["order-info-box"]}
                          style={{ flex: 1 }}
                        >
                          <h4>Customer</h4>
                          <p>{order.full_name}</p>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--color-muted-fg)",
                              fontWeight: "normal",
                            }}
                          >
                            {order.email}
                          </p>
                        </div>
                        <div
                          className={styles["order-info-box"]}
                          style={{ flex: 1 }}
                        >
                          <h4>Order Info</h4>
                          <p>ID: #{order.id.substring(0, 8).toUpperCase()}</p>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--color-muted-fg)",
                              fontWeight: "normal",
                            }}
                          >
                            Placed:{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <h4
                          style={{
                            marginBottom: "0.5rem",
                            color: "var(--color-fg)",
                          }}
                        >
                          Purchased Items
                        </h4>
                        <div className={styles["order-item-list"]}>
                          {order.items.map((item, idx) => (
                            <div key={idx} className={styles["order-item-row"]}>
                              <img
                                src={item.img}
                                className={styles["order-item-img"]}
                                alt={item.name}
                              />
                              <div className={styles["order-item-details"]}>
                                <h5>
                                  {item.name}{" "}
                                  <span
                                    style={{
                                      fontWeight: "normal",
                                      color: "var(--color-muted-fg)",
                                    }}
                                  >
                                    ({item.color})
                                  </span>
                                </h5>
                                <p>
                                  Size: {item.size} | Qty: {item.quantity}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "var(--color-fg)",
                                }}
                              >
                                {window.formatPrice
                                  ? window.formatPrice(item.price * item.quantity)
                                  : `$${item.price * item.quantity}`}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            marginTop: "1rem",
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            color: "var(--color-fg)",
                          }}
                        >
                          Total:{" "}
                          {window.formatPrice
                            ? window.formatPrice(order.total_amount)
                            : `$${order.total_amount}`}
                        </div>
                      </div>
                      <div className={styles["status-updater"]} style={{ marginTop: '1rem' }}>
                        <div className={styles["form-group"]}>
                          <label>Update Order Status</label>
                          <select
                            id="modal-status-select"
                            className={`${styles["form-input"]} ${styles["custom-select-arrow"]}`}
                            defaultValue={order.status}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                        <button
                          className={styles["btn-primary"]}
                          style={{ height: "48px" }}
                          onClick={() =>
                            handleOrderStatusUpdate(
                              order.id,
                              document.getElementById("modal-status-select").value,
                            )
                          }
                        >
                          Save Status
                        </button>
                      </div>
                    </div>
                  </div>
                </CustomScrollbar>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sidebar Filters Modal */}
      <div
        className={`${styles["modal-overlay"]} ${activeModal === "sidebar" ? styles.active : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveModal(null);
        }}
      >
        <div className={styles["modal-content"]}>
          <div className={styles["modal-header"]}>
            <h3 className={styles["modal-title"]} style={{ margin: 0 }}>
              Manage Storefront Sidebar
            </h3>
            <button
              className={styles["close-modal"]}
              onClick={() => setActiveModal(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles["modal-form"]}>
            <CustomScrollbar>
              <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <p
                  className={styles["text-muted"]}
                  style={{ marginTop: "-1rem", fontSize: "0.9rem" }}
                >
                  Control exactly which Categories and Brands appear in the customer
                  sidebar. Drag and drop the pills to reorder them!
                </p>

                <div className={styles["form-group"]}>
                  <label>Sidebar Categories</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      style={{ flex: 1 }}
                      placeholder="e.g. Running"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                    />
                    <button
                      className={styles["btn-primary"]}
                      onClick={() => {
                        if (
                          newCat.trim() &&
                          !sidebarConfig.categories.includes(newCat.trim())
                        ) {
                          setSidebarConfig((prev) => ({
                            ...prev,
                            categories: [...prev.categories, newCat.trim()],
                          }));
                          setNewCat("");
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className={styles["filter-pill-container"]}>
                    {sidebarConfig.categories.map((c, i) => (
                      <div
                        key={c}
                        className={styles["filter-pill"]}
                        draggable="true"
                        onDragStart={(e) => onDragStart(e, i, "category")}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, i, "category")}
                      >
                        <i
                          className="bi bi-grip-vertical"
                          style={{ cursor: "grab", color: "var(--color-muted-fg)" }}
                        ></i>{" "}
                        {c}
                        <button
                          onClick={() =>
                            setSidebarConfig((prev) => ({
                              ...prev,
                              categories: prev.categories.filter(
                                (_, idx) => idx !== i,
                              ),
                            }))
                          }
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <hr
                  className={styles["section-divider"]}
                  style={{ margin: "1rem 0" }}
                />

                <div className={styles["form-group"]}>
                  <label>Sidebar Brands</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      style={{ flex: 1 }}
                      placeholder="e.g. Reebok"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                    <button
                      className={styles["btn-primary"]}
                      onClick={() => {
                        if (
                          newBrand.trim() &&
                          !sidebarConfig.brands.includes(newBrand.trim())
                        ) {
                          setSidebarConfig((prev) => ({
                            ...prev,
                            brands: [...prev.brands, newBrand.trim()],
                          }));
                          setNewBrand("");
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className={styles["filter-pill-container"]}>
                    {sidebarConfig.brands.map((b, i) => (
                      <div
                        key={b}
                        className={styles["filter-pill"]}
                        draggable="true"
                        onDragStart={(e) => onDragStart(e, i, "brand")}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, i, "brand")}
                      >
                        <i
                          className="bi bi-grip-vertical"
                          style={{ cursor: "grab", color: "var(--color-muted-fg)" }}
                        ></i>{" "}
                        {b}
                        <button
                          onClick={() =>
                            setSidebarConfig((prev) => ({
                              ...prev,
                              brands: prev.brands.filter((_, idx) => idx !== i),
                            }))
                          }
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`${styles["btn-primary"]} ${styles["full-width"]}`}
                  onClick={saveSidebarSettings}
                  style={{ marginTop: "1rem" }}
                >
                  Save Sidebar Settings
                </button>
              </div>
            </CustomScrollbar>
          </div>
        </div>
      </div>


    </React.Fragment>
  );
}
