function initHeader() {
  // ==========================================
  // Active Page Indicator & Seamless Navigation Logic
  // ==========================================
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const urlParams = new URLSearchParams(window.location.search);
  const currentCategory = urlParams.get("category");
  const navLinksAnchor = document.querySelectorAll(".nav-links a");

  function updateActiveLink(targetCategory) {
    navLinksAnchor.forEach((link) => {
      link.classList.remove("active");
      const dataNav = link.getAttribute("data-nav");

      if (currentPath === "products.html" && targetCategory === dataNav) {
        link.classList.add("active");
      } else if (currentPath === "about.html" && dataNav === "about") {
        link.classList.add("active");
      } else if (currentPath === "contact.html" && dataNav === "contact") {
        link.classList.add("active");
      }
    });
  }

  // Initial load check
  updateActiveLink(currentCategory);

  // Seamless navigation: If on products page and clicked a product link, don't reload!
  navLinksAnchor.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (currentPath === "products.html" && href.startsWith("products.html")) {
        e.preventDefault();
        const targetCategory = link.getAttribute("data-nav");

        const newUrl =
          window.location.protocol +
          "//" +
          window.location.host +
          window.location.pathname +
          "?category=" +
          targetCategory;
        window.history.pushState({ path: newUrl }, "", newUrl);

        updateActiveLink(targetCategory);
        window.dispatchEvent(
          new CustomEvent("categoryChanged", { detail: targetCategory }),
        );

        if (window.innerWidth <= 992) closeMobileMenu();
      }
    });
  });

  // Seamless Wishlist redirect if already on Dashboard
  const wishlistBtn = document.getElementById("headerWishlistBtn");
  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", (e) => {
      if (currentPath === "clientDashboard.html") {
        e.preventDefault();
        const newUrl =
          window.location.protocol +
          "//" +
          window.location.host +
          window.location.pathname +
          "?view=wishlist";
        window.history.pushState({ path: newUrl }, "", newUrl);
        window.dispatchEvent(
          new CustomEvent("viewChanged", { detail: "wishlist" }),
        );
      }
    });
  }

  // ==========================================
  // Mobile Menu Slide-Out Drawer Logic
  // ==========================================
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileMenuClose = document.getElementById("mobileMenuClose");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
  const navLinks = document.getElementById("navLinks");

  function openMobileMenu() {
    navLinks.classList.add("active");
    mobileMenuOverlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent scrolling behind drawer
  }

  function closeMobileMenu() {
    navLinks.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openMobileMenu);
  if (mobileMenuClose)
    mobileMenuClose.addEventListener("click", closeMobileMenu);
  if (mobileMenuOverlay)
    mobileMenuOverlay.addEventListener("click", closeMobileMenu);

  // ==========================================
  // Navbar Background on Scroll
  // ==========================================
  const navbar = document.querySelector(".navbar");

  function handleScroll() {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  // ==========================================
  // Theme Toggle Logic
  // ==========================================
  const themeBtn = document.querySelector(".theme-toggle-btn");
  const themeIcon = themeBtn.querySelector("i");
  const logoImg = document.querySelector(".logo-img");

  if (document.documentElement.getAttribute("data-theme") === "dark") {
    themeIcon.classList.replace("bi-sun", "bi-moon");
    if (logoImg) logoImg.src = "../../public/images/logos/stride_logo_dark.png";
  }

  themeBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");

    if (currentTheme === "dark") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      themeIcon.classList.replace("bi-moon", "bi-sun");
      if (logoImg)
        logoImg.src = "../../public/images/logos/stride_logo_light.png";
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      themeIcon.classList.replace("bi-sun", "bi-moon");
      if (logoImg)
        logoImg.src = "../../public/images/logos/stride_logo_dark.png";
    }
  });

  // ==========================================
  // Search Overlay Logic
  // ==========================================
  const searchToggleBtn = document.querySelector(".search-toggle-btn");
  const searchModal = document.getElementById("searchModal");
  const closeSearchBtn = document.getElementById("closeSearchBtn");
  const searchInput = document.getElementById("headerSearchInput");
  const searchResults = document.getElementById("searchResults");

  const dummyProducts = [
    {
      name: "Nike Air Max Fusion",
      price: "$149.99",
      img: "../../public/images/shoe-1.jpg",
      link: "productDetail.html",
    },
    {
      name: "Adidas Ultraboost 23",
      price: "$179.99",
      img: "../../public/images/shoe-2.jpg",
      link: "productDetail.html",
    },
    {
      name: "Nike Jordan Legacy",
      price: "$199.99",
      img: "../../public/images/shoe-3.jpg",
      link: "productDetail.html",
    },
    {
      name: "New Balance 550 Classic",
      price: "$129.99",
      img: "../../public/images/shoe-4.jpg",
      link: "productDetail.html",
    },
    {
      name: "Puma RS-X Tech",
      price: "$119.99",
      img: "../../public/images/shoe-5.jpg",
      link: "productDetail.html",
    },
    {
      name: "Nike Dunk Low",
      price: "$159.99",
      img: "../../public/images/shoe-6.jpg",
      link: "productDetail.html",
    },
  ];

  if (searchToggleBtn && searchModal) {
    searchToggleBtn.addEventListener("click", () => {
      searchModal.classList.add("active");
      document.body.style.overflow = "hidden";
      setTimeout(() => searchInput.focus(), 100);
    });

    closeSearchBtn.addEventListener("click", () => {
      searchModal.classList.remove("active");
      document.body.style.overflow = "";
      searchInput.value = "";
      searchResults.innerHTML = "";
    });

    searchModal.addEventListener("click", (e) => {
      if (e.target === searchModal) {
        searchModal.classList.remove("active");
        document.body.style.overflow = "";
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      searchResults.innerHTML = "";

      if (query.length === 0) return;

      const filtered = dummyProducts.filter((p) =>
        p.name.toLowerCase().includes(query),
      );

      if (filtered.length === 0) {
        searchResults.innerHTML = `<div class="no-search-results">No products found matching "${query}"</div>`;
        return;
      }

      filtered.forEach((p) => {
        const item = document.createElement("a");
        item.href = p.link;
        item.className = "search-result-item";
        item.innerHTML = `
          <img src="${p.img}" alt="${p.name}" class="search-result-img" />
          <div class="search-result-info">
            <span class="search-result-name">${p.name}</span>
            <span class="search-result-price">${p.price}</span>
          </div>
        `;
        searchResults.appendChild(item);
      });
    });
  }

  // ==========================================
  // Account Dropdown & Auth Logic
  // ==========================================
  const accountBtn = document.querySelector(".account-btn");
  const accountDropdown = document.getElementById("accountDropdown");
  const dashboardLink = document.getElementById("dashboardLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const userRole = localStorage.getItem("userRole");

      if (!userRole) {
        window.location.href = "login.html";
      } else {
        accountDropdown.classList.toggle("show");
        if (userRole === "admin") {
          dashboardLink.href = "adminDashboard.html";
        } else {
          dashboardLink.href = "clientDashboard.html";
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (accountDropdown && accountDropdown.classList.contains("show")) {
      if (!e.target.closest(".account-container")) {
        accountDropdown.classList.remove("show");
      }
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      window.location.href = "login.html";
    });
  }
}
