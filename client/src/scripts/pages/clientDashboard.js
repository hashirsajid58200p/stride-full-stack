document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // MOCK DATABASE & STATE
  // ==========================================
  const db = {
    user: {
      fullName: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 234 567 8900",
      address: "123 Sneaker Street",
      postalCode: "10001",
      avatarUrl: null,
    },
    wishlist: [
      {
        id: "W1",
        name: "Nike Air Max 270",
        brand: "Nike",
        price: 150.0,
        img: "../../public/images/shoe-1.jpg",
      },
      {
        id: "W2",
        name: "Adidas Ultraboost 23",
        brand: "Adidas",
        price: 180.0,
        img: "../../public/images/shoe-2.jpg",
      },
      {
        id: "W3",
        name: "Jordan Legacy 312",
        brand: "Jordan",
        price: 199.99,
        img: "../../public/images/shoe-3.jpg",
      },
    ],
    orders: [
      {
        id: "#ORD-89012",
        date: "May 30, 2024",
        total: "$329.98",
        status: "Delivered",
        items: "Nike Air Max 270",
        img: "../../public/images/shoe-1.jpg",
      },
      {
        id: "#ORD-89011",
        date: "May 15, 2024",
        total: "$179.99",
        status: "Shipped",
        items: "Adidas Ultraboost 23",
        img: "../../public/images/shoe-2.jpg",
      },
      {
        id: "#ORD-88950",
        date: "April 02, 2024",
        total: "$129.99",
        status: "Processing",
        items: "New Balance 550",
        img: "../../public/images/shoe-4.jpg",
      },
    ],
    news: [
      {
        title: "Yeezy Restock Announced",
        desc: "Get ready for the massive restock happening this Friday. Limited pairs available.",
      },
      {
        title: "Summer Style Guide",
        desc: "Check out our top picks for keeping your rotation fresh this summer.",
      },
      {
        title: "Nike Air Max Day",
        desc: "Special exclusive drops for members only starting next week.",
      },
    ],
  };

  // ==========================================
  // THEME TOGGLE LOGIC (EXACT REQUESTED LOGIC)
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
  // RENDER FUNCTIONS (Injecting Data)
  // ==========================================

  function renderDashboard() {
    // Render user names dynamically
    const firstName = db.user.fullName.split(" ")[0];

    // Dynamically update document title based on User's first name
    document.title = `${firstName}'s Dashboard`;

    document.getElementById("header-user-name").textContent = db.user.fullName;
    document.getElementById("banner-user-name").textContent = firstName;

    // Render Avatar if exists
    updateAvatarDisplay(db.user.avatarUrl, db.user.fullName);

    // Render Wishlist Previews & Full Grid
    const wishHtml = db.wishlist
      .map(
        (item) => `
            <div class="wish-card">
                <div class="card-img-wrapper">
                    <img src="${item.img}" alt="${item.name}">
                </div>
                <div class="card-main-info">
                    <h4>${item.name}</h4>
                    <span class="card-price">$${item.price.toFixed(2)}</span>
                </div>
                <div class="wish-actions">
                    <a href="checkout.html" class="btn-primary">Buy Now</a>
                    <button class="btn-outline wishlist-add-to-cart" data-id="${item.id}">
                        Add to Cart
                    </button>
                </div>
            </div>
        `,
      )
      .join("");

    document.getElementById("dashboard-wishlist-preview").innerHTML = wishHtml;
    document.getElementById("full-wishlist-grid").innerHTML = wishHtml;

    // Render Orders Preview & Full List
    const ordersHtml = db.orders
      .map(
        (order) => `
            <div class="dash-order-card">
                <div class="card-img-wrapper">
                    <img src="${order.img}" alt="${order.items}">
                </div>
                <div class="card-main-info">
                    <h4>${order.items}</h4>
                    <p>${order.id} • ${order.date}</p>
                </div>
                <div class="card-footer-info">
                    <span class="card-price">${order.total}</span>
                    <span class="badge ${getStatusBadge(order.status)}">${order.status}</span>
                </div>
            </div>
        `,
      )
      .join("");

    document.getElementById("dashboard-orders-preview").innerHTML = ordersHtml;
    document.getElementById("full-orders-list").innerHTML = ordersHtml;

    // Render News
    const newsHtml = db.news
      .map(
        (n) => `
            <div class="news-card">
                <h4>${n.title}</h4>
                <p>${n.desc}</p>
            </div>
        `,
      )
      .join("");
    document.getElementById("dashboard-news-list").innerHTML = newsHtml;

    // Populate Profile Form
    document.getElementById("prof-fullname").value = db.user.fullName;
    document.getElementById("prof-email").value = db.user.email;
    document.getElementById("prof-phone").value = db.user.phone;
    document.getElementById("prof-postal").value = db.user.postalCode;
    document.getElementById("prof-address").value = db.user.address;
  }

  function getStatusBadge(status) {
    if (status === "Delivered") return "badge-success";
    if (status === "Processing") return "badge-warning";
    if (status === "Shipped") return "badge-info";
    return "";
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
      profilePreview.innerHTML = imgHTML;
    } else {
      headerAvatar.textContent = initials;
      profilePreview.innerHTML = `<span id="preview-initials">${initials}</span>`;
    }
  }

  // ==========================================
  // SPA NAVIGATION LOGIC (Tab Switching)
  // ==========================================
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
  const viewSections = document.querySelectorAll(".view-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      // Allow logout to work natively
      if (link.getAttribute("href") === "index.html") return;

      e.preventDefault();

      const target = link.getAttribute("data-target");
      if (!target) return;

      // Update Active Link Styling
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // Hide all views, show target view
      viewSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(`view-${target}`).classList.add("active");

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

  // Wishlist "Add to Cart" Click Handler (Hooks into global cart system)
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".wishlist-add-to-cart");
    if (addBtn) {
      const itemId = addBtn.dataset.id;
      const itemToAdd = db.wishlist.find((item) => item.id === itemId);

      if (itemToAdd) {
        let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
        const existingItem = cartItems.find((i) => i.name === itemToAdd.name);

        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cartItems.push({
            name: itemToAdd.name,
            brand: itemToAdd.brand,
            price: itemToAdd.price,
            img: itemToAdd.img,
            quantity: 1,
          });
        }

        localStorage.setItem("strideCart", JSON.stringify(cartItems));

        // Dispatch event so main.js/cart.js updates the cart UI instantly
        window.dispatchEvent(new Event("cartUpdated"));
        showToast(`${itemToAdd.name} added to cart!`);
      }
    }
  });

  // Profile Form Submission
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Save updated user data
      db.user.fullName = document.getElementById("prof-fullname").value;

      // Extract the new first name for the banner and page title
      const newFirstName = db.user.fullName.split(" ")[0];

      // Instantly update the UI elements
      document.getElementById("header-user-name").textContent =
        db.user.fullName;
      document.getElementById("banner-user-name").textContent = newFirstName;
      document.title = `${newFirstName}'s Dashboard`;

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

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById("sidebar");
  const openBtn = document.getElementById("openSidebar");
  const closeBtn = document.getElementById("closeSidebar");

  if (openBtn && closeBtn && sidebar) {
    openBtn.addEventListener("click", () => sidebar.classList.add("active"));
    closeBtn.addEventListener("click", () =>
      sidebar.classList.remove("active"),
    );
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
