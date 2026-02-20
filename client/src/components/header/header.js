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
}
