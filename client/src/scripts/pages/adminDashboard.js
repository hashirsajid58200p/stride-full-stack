document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // DYNAMIC DATE
  // ==========================================
  const topDateElement = document.getElementById("top-header-date");
  if (topDateElement) {
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    topDateElement.textContent = new Date().toLocaleDateString(
      "en-US",
      options,
    );
  }

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
        brand: "Nike",
        price: "$149.99",
        stock: 45,
        status: "In Stock",
        img: "../../public/images/shoe-1.jpg",
      },
      {
        id: "PRD-002",
        name: "Adidas Ultraboost 23",
        brand: "Adidas",
        price: "$179.99",
        stock: 12,
        status: "Low Stock",
        img: "../../public/images/shoe-2.jpg",
      },
      {
        id: "PRD-003",
        name: "Jordan Legacy",
        brand: "Nike",
        price: "$199.99",
        stock: 0,
        status: "Out of Stock",
        img: "../../public/images/shoe-3.jpg",
      },
      {
        id: "PRD-004",
        name: "New Balance 550",
        brand: "New Balance",
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
    customers: [
      {
        name: "John Doe",
        email: "john@example.com",
        mobile: "+1 234 567 8900",
        status: "Active",
        postal: "10001",
        address: "123 Main St, NY",
      },
      {
        name: "Sarah Williams",
        email: "sarah.w@example.com",
        mobile: "+1 987 654 3210",
        status: "Active",
        postal: "90210",
        address: "456 Oak Ave, CA",
      },
      {
        name: "Michael Chen",
        email: "m.chen@example.com",
        mobile: "+1 555 123 4567",
        status: "Inactive",
        postal: "60601",
        address: "789 Pine Rd, IL",
      },
    ],
  };

  // ==========================================
  // TOP SELLING HORIZONTAL SCROLL
  // ==========================================
  const leftArrow = document.getElementById("scroll-left-btn");
  const rightArrow = document.getElementById("scroll-right-btn");
  const scrollContainer = document.getElementById("top-products-container");

  if (leftArrow && rightArrow && scrollContainer) {
    leftArrow.addEventListener("click", () => {
      scrollContainer.scrollBy({ left: -250, behavior: "smooth" });
    });
    rightArrow.addEventListener("click", () => {
      scrollContainer.scrollBy({ left: 250, behavior: "smooth" });
    });
  }

  // ==========================================
  // THEME TOGGLE LOGIC
  // ==========================================
  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = themeBtn.querySelector("i");
  const logoImg = document.getElementById("sidebar-logo");

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
  // MODALS LOGIC
  // ==========================================

  // Product Modal
  const prodModal = document.getElementById("productModal");
  const openProdBtn = document.getElementById("openAddProductModal");
  const closeProdBtn = document.getElementById("closeProductModal");
  const colorUploadsContainer = document.getElementById(
    "color-uploads-container",
  );
  const colorCheckboxes = document.querySelectorAll('input[name="color"]');
  const sizeCheckboxes = document.querySelectorAll(".size-check");

  if (openProdBtn)
    openProdBtn.addEventListener("click", () =>
      prodModal.classList.add("active"),
    );
  if (closeProdBtn)
    closeProdBtn.addEventListener("click", () =>
      prodModal.classList.remove("active"),
    );

  colorCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const color = cb.value;
      if (cb.checked) {
        const row = document.createElement("div");
        row.className = "color-upload-row";
        row.id = `upload-row-${color}`;
        row.innerHTML = `
          <span style="min-width: 80px; font-weight: 600;">${color}:</span>
          <input type="file" accept="image/*" required style="flex-grow: 1;">
        `;
        colorUploadsContainer.appendChild(row);
      } else {
        const row = document.getElementById(`upload-row-${color}`);
        if (row) row.remove();
      }
    });
  });

  sizeCheckboxes.forEach((sc) => {
    sc.addEventListener("change", () => {
      const qtyInput = sc.closest(".size-row").querySelector(".qty-input");
      if (sc.checked) {
        qtyInput.disabled = false;
        qtyInput.focus();
        qtyInput.required = true;
      } else {
        qtyInput.disabled = true;
        qtyInput.value = "";
        qtyInput.required = false;
      }
    });
  });

  const addProductForm = document.getElementById("addProductForm");
  if (addProductForm) {
    addProductForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Product Added Successfully to Database!");
      prodModal.classList.remove("active");
      addProductForm.reset();
      colorUploadsContainer.innerHTML = "";
      document
        .querySelectorAll(".qty-input")
        .forEach((input) => (input.disabled = true));
    });
  }

  // Offer Modal
  const offerModal = document.getElementById("offerModal");
  const dashOpenOfferBtn = document.getElementById("dashOpenOfferModal");
  const openOfferBtn = document.getElementById("openOfferModal");
  const closeOfferBtn = document.getElementById("closeOfferModal");
  const addOfferForm = document.getElementById("addOfferForm");

  if (dashOpenOfferBtn)
    dashOpenOfferBtn.addEventListener("click", () =>
      offerModal.classList.add("active"),
    );
  if (openOfferBtn)
    openOfferBtn.addEventListener("click", () =>
      offerModal.classList.add("active"),
    );
  if (closeOfferBtn)
    closeOfferBtn.addEventListener("click", () =>
      offerModal.classList.remove("active"),
    );

  if (addOfferForm) {
    addOfferForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Offer Created Successfully!");
      offerModal.classList.remove("active");
      addOfferForm.reset();
    });
  }

  // Customer Modal (Exposed globally so inline HTML handlers can call it)
  const custModal = document.getElementById("customerModal");
  const closeCustBtn = document.getElementById("closeCustomerModal");
  const editCustomerForm = document.getElementById("editCustomerForm");

  if (closeCustBtn)
    closeCustBtn.addEventListener("click", () =>
      custModal.classList.remove("active"),
    );

  if (editCustomerForm) {
    editCustomerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Customer details updated!");
      custModal.classList.remove("active");
    });
  }

  window.openCustomerEditModal = function (index) {
    const cust = db.customers[index];
    document.getElementById("cust-fullname").value = cust.name;
    document.getElementById("cust-email").value = cust.email;
    document.getElementById("cust-phone").value = cust.mobile;
    document.getElementById("cust-postal").value = cust.postal;
    document.getElementById("cust-address").value = cust.address;
    if (custModal) custModal.classList.add("active");
  };

  // Order Details Modal
  const orderDetailsModal = document.getElementById("orderDetailsModal");
  const closeOrderDetailsBtn = document.getElementById("closeOrderDetailsBtn");
  const closeOrderDetailsIcon = document.getElementById(
    "closeOrderDetailsModal",
  );
  const orderDetailsContent = document.getElementById("order-details-content");
  const orderDetailsTitle = document.getElementById("order-details-title");

  if (closeOrderDetailsBtn)
    closeOrderDetailsBtn.addEventListener("click", () =>
      orderDetailsModal.classList.remove("active"),
    );
  if (closeOrderDetailsIcon)
    closeOrderDetailsIcon.addEventListener("click", () =>
      orderDetailsModal.classList.remove("active"),
    );

  window.openOrderDetailsModal = function (orderId) {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return;

    orderDetailsTitle.textContent = `Order Details: ${order.id}`;
    orderDetailsContent.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Customer Name</label>
                <input type="text" value="${order.customer}" readonly />
            </div>
            <div class="form-group">
                <label>Order Date</label>
                <input type="text" value="${order.date}" readonly />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Total Items</label>
                <input type="text" value="${order.items}" readonly />
            </div>
             <div class="form-group">
                <label>Total Amount</label>
                <input type="text" value="${order.total}" readonly />
            </div>
        </div>
         <div class="form-group">
            <label>Status</label>
            <div><span class="badge ${getStatusBadge(order.status)}">${order.status}</span></div>
        </div>
    `;
    if (orderDetailsModal) orderDetailsModal.classList.add("active");
  };

  // ==========================================
  // SEARCH FUNCTIONALITY
  // ==========================================
  function setupSearch(inputId, tableBodyId, data, renderFn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredData = data.filter((item) => {
        return Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm),
        );
      });
      renderFn(filteredData);
    });
  }

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  function renderDashboard() {
    document.getElementById("header-user-name").textContent = db.user.fullName;
    updateAvatarDisplay(db.user.avatarUrl, db.user.fullName);

    const profFullname = document.getElementById("prof-fullname");
    if (profFullname) {
      profFullname.value = db.user.fullName;
      document.getElementById("prof-email").value = db.user.email;
      document.getElementById("prof-phone").value = db.user.phone;
      document.getElementById("prof-postal").value = db.user.postalCode;
      document.getElementById("prof-address").value = db.user.address;
    }

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
    if (
      status === "Out of Stock" ||
      status === "Expired" ||
      status === "Inactive"
    )
      return "badge-danger";
    if (status === "Shipped") return "badge-info";
    return "";
  }

  function renderProductsTable(data = db.products) {
    const tbody = document.getElementById("products-table-body");
    if (!tbody) return;
    tbody.innerHTML = data
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
                <td>${p.brand}</td>
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

  function renderInventoryTable(data = db.products) {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody) return;
    tbody.innerHTML = data
      .map(
        (p) => `
            <tr>
                <td>
                    <div class="table-product-cell">
                        <img src="${p.img}" alt="${p.name}" class="table-product-img">
                        <span class="table-product-name">${p.name}</span>
                    </div>
                </td>
                <td>${p.stock} units</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="number" min="1" placeholder="Qty" style="width: 80px; padding: 0.3rem; border-radius: 4px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-fg);" />
                        <button class="btn btn-primary btn-sm" onclick="showToast('Stock Added for ${p.name}')">Restock</button>
                        <button class="btn btn-danger-outline btn-sm" onclick="if(confirm('Mark ${p.name} as Out of Stock?')) showToast('${p.name} marked Out of Stock')">Out of Stock</button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  function renderOrdersTable(data = db.orders) {
    const tbody = document.getElementById("orders-table-body");
    if (!tbody) return;
    tbody.innerHTML = data
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
                        <button class="btn-outline" onclick="openOrderDetailsModal('${o.id}')">View Details</button>
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

  function renderCustomersTable(data = db.customers) {
    const tbody = document.getElementById("customers-table-body");
    if (!tbody) return;
    tbody.innerHTML = data
      .map(
        (c, index) => `
            <tr>
                <td class="font-semibold">${c.name}</td>
                <td>${c.email}</td>
                <td>${c.mobile}</td>
                <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-outline" onclick="openCustomerEditModal(${index})"><i class="bi bi-pencil"></i></button>
                        <button class="btn-danger-outline" onclick="if(confirm('Remove user ${c.name}?')) showToast('User removed.')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

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
  // SPA NAVIGATION LOGIC
  // ==========================================
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
  const viewSections = document.querySelectorAll(".view-section");
  const pageTitle = document.getElementById("dynamic-page-title");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href") === "index.html") return;
      e.preventDefault();

      const target = link.getAttribute("data-target");
      if (!target) return;

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      if (pageTitle) {
        if (target === "dashboard") {
          pageTitle.textContent = "Overview";
        } else if (target === "profile") {
          pageTitle.textContent = "Personal Information";
        } else if (target === "analytics") {
          pageTitle.textContent = "Product Analytics";
        } else {
          pageTitle.textContent = target;
        }
      }

      viewSections.forEach((section) => section.classList.remove("active"));
      const targetView = document.getElementById(`view-${target}`);
      if (targetView) {
        targetView.classList.add("active");
      }

      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("active");
      }
    });
  });

  // ==========================================
  // INITIALIZATION
  // ==========================================
  renderDashboard();
  renderProductsTable();
  renderInventoryTable();
  renderOrdersTable();
  renderOffersTable();
  renderCustomersTable();

  // Setup Search Listeners
  setupSearch(
    "product-search-input",
    "products-table-body",
    db.products,
    renderProductsTable,
  );
  setupSearch(
    "inventory-search-input",
    "inventory-table-body",
    db.products,
    renderInventoryTable,
  );
  setupSearch(
    "order-search-input",
    "orders-table-body",
    db.orders,
    renderOrdersTable,
  );
  setupSearch(
    "customer-search-input",
    "customers-table-body",
    db.customers,
    renderCustomersTable,
  );

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

  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Password Updated Successfully!");
      passwordForm.reset();
    });
  }

  const sidebar = document.getElementById("sidebar");
  const openBtnNav = document.getElementById("openSidebar");
  const closeBtnNav = document.getElementById("closeSidebar");

  if (openBtnNav && closeBtnNav && sidebar) {
    openBtnNav.addEventListener("click", () => sidebar.classList.add("active"));
    closeBtnNav.addEventListener("click", () =>
      sidebar.classList.remove("active"),
    );
  }

  window.showToast = function (message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  };
});
