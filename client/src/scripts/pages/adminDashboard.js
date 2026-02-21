document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // MOCK DATABASE (Simulating a real backend API)
  // ==========================================

  const db = {
    user: {
      fullName: "Super Admin",
      email: "admin@stride.com",
      phone: "+1 987 654 3210",
      address: "Stride HQ, Admin Block",
      postalCode: "10001",
      avatarUrl: null,
    },
    overview: {
      revenue: "$82,650",
      revTrend: "+11%",
      revClass: "positive",
      revIcon: "bi-arrow-up-right",
      orders: "1,645",
      ordTrend: "+11%",
      ordClass: "positive",
      ordIcon: "bi-arrow-up-right",
      customers: "1,462",
      custTrend: "-17%",
      custClass: "negative",
      custIcon: "bi-arrow-down-right",
      pending: "117",
      pendTrend: "-5%",
      pendClass: "negative",
      pendIcon: "bi-arrow-down-right",
    },
    topProducts: [
      {
        name: "Air Jordan 8",
        stock: 752,
        img: "../../public/images/shoe-3.jpg",
      },
      {
        name: "Air Jordan 5",
        stock: 612,
        img: "../../public/images/shoe-1.jpg",
      },
      {
        name: "Air Jordan 13",
        stock: 430,
        img: "../../public/images/shoe-2.jpg",
      },
      {
        name: "Nike Air Max",
        stock: 325,
        img: "../../public/images/shoe-4.jpg",
      },
      {
        name: "Nike Dunk Low",
        stock: 290,
        img: "../../public/images/shoe-5.jpg",
      },
    ],
    offers: [
      {
        title: "40% Discount Offer",
        expiry: "05-08-2024",
        progress: 75,
        colorClass: "",
      },
      {
        title: "Summer Sale Coupon",
        expiry: "10-09-2024",
        progress: 45,
        colorClass: "bg-blue",
      },
      {
        title: "Clearance Event",
        expiry: "14-09-2024",
        progress: 30,
        colorClass: "bg-accent",
      },
    ],
    products: [
      {
        id: "PRD-001",
        name: "Nike Air Max Fusion",
        category: "Running",
        price: "$149.99",
        stock: 45,
        status: "In Stock",
        img: "../../public/images/shoe-1.jpg",
      },
      {
        id: "PRD-002",
        name: "Adidas Ultraboost 23",
        category: "Running",
        price: "$179.99",
        stock: 12,
        status: "Low Stock",
        img: "../../public/images/shoe-2.jpg",
      },
      {
        id: "PRD-003",
        name: "Jordan Legacy",
        category: "Basketball",
        price: "$199.99",
        stock: 0,
        status: "Out of Stock",
        img: "../../public/images/shoe-3.jpg",
      },
      {
        id: "PRD-004",
        name: "New Balance 550",
        category: "Lifestyle",
        price: "$129.99",
        stock: 156,
        status: "In Stock",
        img: "../../public/images/shoe-4.jpg",
      },
    ],
    orders: [
      {
        id: "#ORD-8901",
        customer: "Sarah Williams",
        date: "2024-05-30",
        items: 2,
        total: "$329.98",
        status: "Delivered",
      },
      {
        id: "#ORD-8902",
        customer: "Michael Chen",
        date: "2024-05-29",
        items: 1,
        total: "$179.99",
        status: "Shipped",
      },
      {
        id: "#ORD-8903",
        customer: "Emma Thompson",
        date: "2024-05-29",
        items: 3,
        total: "$450.00",
        status: "Processing",
      },
      {
        id: "#ORD-8904",
        customer: "James Wilson",
        date: "2024-05-28",
        items: 1,
        total: "$129.99",
        status: "Delivered",
      },
    ],
    campaigns: [
      {
        name: "Summer Kickoff",
        code: "SUMMER24",
        value: "20% OFF",
        until: "Aug 31, 2024",
        limit: "500 / 1000",
        status: "Active",
      },
      {
        name: "Welcome Bonus",
        code: "WELCOME10",
        value: "10% OFF",
        until: "No Expiry",
        limit: "∞",
        status: "Active",
      },
      {
        name: "Flash Sale",
        code: "FLASH50",
        value: "$50 OFF",
        until: "May 25, 2024",
        limit: "100 / 100",
        status: "Expired",
      },
    ],
  };

  // ==========================================
  // THEME TOGGLE LOGIC
  // ==========================================
  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = themeBtn.querySelector("i");
  const logoImg = document.getElementById("sidebar-logo");

  // Check saved theme or default to light
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  themeBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === "dark") {
      themeIcon.classList.remove("bi-moon");
      themeIcon.classList.add("bi-sun");
      if (logoImg)
        logoImg.src = "../../public/images/logos/stride_logo_light.png";
    } else {
      themeIcon.classList.remove("bi-sun");
      themeIcon.classList.add("bi-moon");
      if (logoImg)
        logoImg.src = "../../public/images/logos/stride_logo_dark.png";
    }
  }

  // ==========================================
  // RENDER FUNCTIONS (Injecting data into HTML)
  // ==========================================

  function renderDashboard() {
    // Top Right Profile Name Setup
    document.getElementById("header-user-name").textContent = db.user.fullName;
    updateAvatarDisplay(db.user.avatarUrl, db.user.fullName);

    // Populate Profile Form fields
    const profFullname = document.getElementById("prof-fullname");
    if (profFullname) {
      profFullname.value = db.user.fullName;
      document.getElementById("prof-email").value = db.user.email;
      document.getElementById("prof-phone").value = db.user.phone;
      document.getElementById("prof-postal").value = db.user.postalCode;
      document.getElementById("prof-address").value = db.user.address;
    }

    // Render Stats
    const statsContainer = document.getElementById("overview-stats-container");
    if (statsContainer) {
      statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-info">
                        <p class="stat-label">Total Revenue <span class="stat-period">Last 30 days</span></p>
                        <div class="stat-value-row">
                            <h3 class="stat-value">${db.overview.revenue}</h3>
                            <span class="stat-trend ${db.overview.revClass}"><i class="bi ${db.overview.revIcon}"></i> ${db.overview.revTrend}</span>
                        </div>
                    </div>
                    <div class="stat-icon-wrapper text-accent"><i class="bi bi-currency-dollar"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <p class="stat-label">Total Order <span class="stat-period">Last 30 days</span></p>
                        <div class="stat-value-row">
                            <h3 class="stat-value">${db.overview.orders}</h3>
                            <span class="stat-trend ${db.overview.ordClass}"><i class="bi ${db.overview.ordIcon}"></i> ${db.overview.ordTrend}</span>
                        </div>
                    </div>
                    <div class="stat-icon-wrapper text-blue"><i class="bi bi-cart"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <p class="stat-label">Total Customer <span class="stat-period">Last 30 days</span></p>
                        <div class="stat-value-row">
                            <h3 class="stat-value">${db.overview.customers}</h3>
                            <span class="stat-trend ${db.overview.custClass}"><i class="bi ${db.overview.custIcon}"></i> ${db.overview.custTrend}</span>
                        </div>
                    </div>
                    <div class="stat-icon-wrapper text-purple"><i class="bi bi-people"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <p class="stat-label">Pending Delivery <span class="stat-period">Last 30 days</span></p>
                        <div class="stat-value-row">
                            <h3 class="stat-value">${db.overview.pending}</h3>
                            <span class="stat-trend ${db.overview.pendClass}"><i class="bi ${db.overview.pendIcon}"></i> ${db.overview.pendTrend}</span>
                        </div>
                    </div>
                    <div class="stat-icon-wrapper text-orange"><i class="bi bi-truck"></i></div>
                </div>
            `;
    }

    // Render Top Products
    const topProductsContainer = document.getElementById(
      "top-products-container",
    );
    if (topProductsContainer) {
      topProductsContainer.innerHTML = db.topProducts
        .map(
          (p) => `
                <div class="admin-product-card">
                  <div class="prod-img">
                    <img src="${p.img}" alt="${p.name}">
                  </div>
                  <div class="prod-info">
                    <h4>${p.name}</h4>
                    <p>${p.stock} Pcs</p>
                  </div>
                </div>
            `,
        )
        .join("");
    }

    // Render Offers
    const offersContainer = document.getElementById("current-offers-container");
    if (offersContainer) {
      offersContainer.innerHTML = db.offers
        .map(
          (o) => `
                <div class="offer-item">
                  <div class="offer-text">
                    <span>${o.title}</span>
                    <span class="date">Expire on: ${o.expiry}</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill ${o.colorClass}" style="width: ${o.progress}%;"></div></div>
                </div>
            `,
        )
        .join("");
    }
  }

  function getStatusBadge(status) {
    if (status === "In Stock" || status === "Delivered" || status === "Active")
      return "badge-success";
    if (status === "Low Stock" || status === "Processing")
      return "badge-warning";
    if (status === "Out of Stock" || status === "Expired")
      return "badge-danger";
    if (status === "Shipped") return "badge-info";
    return "";
  }

  function renderProductsTable() {
    const tbody = document.getElementById("products-table-body");
    if (!tbody) return;
    tbody.innerHTML = db.products
      .map(
        (p) => `
            <tr>
                <td class="text-muted">${p.id}</td>
                <td>
                    <div class="table-product-cell">
                        <img src="${p.img}" alt="${p.name}" class="table-product-img">
                        <span class="table-product-name">${p.name}</span>
                    </div>
                </td>
                <td>${p.category}</td>
                <td class="font-semibold">${p.price}</td>
                <td>${p.stock} units</td>
                <td><span class="badge ${getStatusBadge(p.status)}">${p.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-outline" onclick="alert('Edit ${p.name}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn-danger-outline" onclick="alert('Delete ${p.name}')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  function renderOrdersTable() {
    const tbody = document.getElementById("orders-table-body");
    if (!tbody) return;
    tbody.innerHTML = db.orders
      .map(
        (o) => `
            <tr>
                <td class="font-semibold">${o.id}</td>
                <td>${o.customer}</td>
                <td class="text-muted">${o.date}</td>
                <td>${o.items} items</td>
                <td class="font-semibold">${o.total}</td>
                <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-outline" onclick="alert('View Order ${o.id}')">View Details</button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  function renderOffersTable() {
    const tbody = document.getElementById("offers-table-body");
    if (!tbody) return;
    tbody.innerHTML = db.campaigns
      .map(
        (c) => `
            <tr>
                <td class="font-semibold">${c.name}</td>
                <td class="text-accent font-semibold">${c.code}</td>
                <td>${c.value}</td>
                <td class="text-muted">${c.until}</td>
                <td>${c.limit}</td>
                <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-outline" onclick="alert('Edit Campaign')"><i class="bi bi-pencil"></i></button>
                        <button class="btn-danger-outline" onclick="alert('Delete Campaign')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  // Helper to update avatar in header and profile section
  function updateAvatarDisplay(imageUrl, fullName) {
    const headerAvatar = document.getElementById("header-avatar");
    const profilePreview = document.getElementById("profile-preview");
    const initials = fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    if (imageUrl) {
      const imgHTML = `<img src="${imageUrl}" alt="Profile">`;
      headerAvatar.innerHTML = imgHTML;
      if (profilePreview) profilePreview.innerHTML = imgHTML;
    } else {
      headerAvatar.textContent = initials;
      if (profilePreview)
        profilePreview.innerHTML = `<span id="preview-initials">${initials}</span>`;
    }
  }

  // ==========================================
  // SPA NAVIGATION LOGIC (Tab Switching)
  // ==========================================

  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
  const viewSections = document.querySelectorAll(".view-section");
  const pageTitle = document.getElementById("dynamic-page-title");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      // Allow logout to work natively
      if (link.getAttribute("href") === "index.html") return;

      e.preventDefault();

      // 1. Get target view
      const target = link.getAttribute("data-target");
      if (!target) return;

      // 2. Update Active Link Styling
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // 3. Update Page Title
      if (pageTitle) {
        if (target === "dashboard") {
          pageTitle.textContent = "Overview";
        } else if (target === "profile") {
          pageTitle.textContent = "Personal Information";
        } else {
          pageTitle.textContent = target;
        }
      }

      // 4. Hide all views
      viewSections.forEach((section) => {
        section.classList.remove("active");
      });

      // 5. Show target view (or generic placeholder if not built yet)
      const targetView = document.getElementById(`view-${target}`);
      if (targetView) {
        targetView.classList.add("active");
      } else {
        document.getElementById("view-generic").classList.add("active");
        document.querySelector("#view-generic h2").textContent =
          `${target.charAt(0).toUpperCase() + target.slice(1)} Module`;
      }

      // Close mobile sidebar on click
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("active");
      }
    });
  });

  // ==========================================
  // EVENT LISTENERS & INITIALIZATION
  // ==========================================

  // Initialize Data
  renderDashboard();
  renderProductsTable();
  renderOrdersTable();
  renderOffersTable();

  // Profile Image Upload Logic
  const profileUploadInput = document.getElementById("profile-upload-input");
  if (profileUploadInput) {
    profileUploadInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        db.user.avatarUrl = imageUrl;
        updateAvatarDisplay(imageUrl, db.user.fullName);
        showToast("Profile image updated!");
      }
    });
  }

  // Profile Form Submission
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      db.user.fullName = document.getElementById("prof-fullname").value;
      document.getElementById("header-user-name").textContent =
        db.user.fullName;
      if (!db.user.avatarUrl) {
        updateAvatarDisplay(null, db.user.fullName);
      }
      showToast("Personal Information Saved Successfully!");
    });
  }

  // Password Form Submission
  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Password Updated Successfully!");
      passwordForm.reset();
    });
  }

  // Set Current Date in Header
  const dateElement = document.getElementById("current-date");
  if (dateElement) {
    const options = { day: "numeric", month: "short" };
    dateElement.textContent = new Date().toLocaleDateString("en-US", options);
  }

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById("sidebar");
  const openBtn = document.getElementById("openSidebar");
  const closeBtn = document.getElementById("closeSidebar");

  if (openBtn && closeBtn && sidebar) {
    openBtn.addEventListener("click", () => {
      sidebar.classList.add("active");
    });

    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
    });
  }

  // Custom Toast Function
  window.showToast = function (message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  };
});
