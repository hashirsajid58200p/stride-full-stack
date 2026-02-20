// Function defined so main.js can call it when injection is complete
function initHeader() {
  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.style.display =
        navLinks.style.display === "flex" ? "none" : "flex";
    });
  }

  // Smooth Scroll for Navigation Links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Navbar Background on Scroll
  const navbar = document.querySelector(".navbar");

  function handleScroll() {
    if (window.scrollY > 100) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", handleScroll);
  // Trigger immediately on load to set correct initial state
  handleScroll();

  // Theme Toggle Logic
  const themeBtn = document.querySelector(".theme-toggle-btn");
  const themeIcon = themeBtn.querySelector("i");
  const logoImg = document.querySelector(".logo-img");

  // Sync icon and logo with current theme state immediately
  if (document.documentElement.getAttribute("data-theme") === "dark") {
    themeIcon.classList.replace("bi-sun", "bi-moon");
    if (logoImg) logoImg.src = "../../public/images/logos/stride_logo_dark.png";
  }

  // Handle Switch
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
  // Account Dropdown & Auth Logic
  // ==========================================
  const accountBtn = document.querySelector(".account-btn");
  const accountDropdown = document.getElementById("accountDropdown");
  const dashboardLink = document.getElementById("dashboardLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent document click from immediately closing it

      // Check if user is logged in
      const userRole = localStorage.getItem("userRole");

      if (!userRole) {
        // Not logged in: Redirect to login
        window.location.href = "login.html";
      } else {
        // Logged in: Toggle Dropdown
        accountDropdown.classList.toggle("show");

        // Dynamically set Dashboard route
        if (userRole === "admin") {
          dashboardLink.href = "adminDashboard.html";
        } else {
          dashboardLink.href = "clientDashboard.html";
        }
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (accountDropdown && accountDropdown.classList.contains("show")) {
      if (!e.target.closest(".account-container")) {
        accountDropdown.classList.remove("show");
      }
    }
  });

  // Logout Logic
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      // Redirect to home or login page after logout
      window.location.href = "login.html";
    });
  }
}
