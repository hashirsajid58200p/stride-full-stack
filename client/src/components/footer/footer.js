// Function specifically called by main.js after footer injection
function initFooter() {
  // 1. Dynamic Year Logic
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // 2. Interactive Heart Toggle Logic
  const heartIcon = document.getElementById("love-icon");
  if (heartIcon) {
    // We use .onclick to ensure we don't accidentally attach multiple listeners
    // if initFooter is called more than once by the dynamic loader
    heartIcon.onclick = function () {
      // Check if it is currently unfilled
      if (this.classList.contains("bi-heart")) {
        this.classList.remove("bi-heart");
        this.classList.add("bi-heart-fill", "filled");
      } else {
        // Otherwise, it is filled, so unfill it
        this.classList.remove("bi-heart-fill", "filled");
        this.classList.add("bi-heart");
      }
    };
  }
}

// Fallback initialization just in case it's loaded standalone
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFooter);
} else {
  initFooter();
}

// ==========================================
// Toast Notification Function (Existing)
// ==========================================
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--color-primary);
        color: var(--color-primary-fg);
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideUp 0.3s ease-out;
    `;

  document.body.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.transition = "all 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// Intersection Observer for Scroll Animations (Existing)
// ==========================================
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe elements for scroll animations (Will safely ignore if none exist)
document.querySelectorAll(".product-card, .brand-card").forEach((el) => {
  observer.observe(el);
});
