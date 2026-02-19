// Add to Cart Functionality
let cartCount = 0;
const cartBadge = document.querySelector(".cart-badge");
const addToCartButtons = document.querySelectorAll(".add-to-cart");

addToCartButtons.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    cartCount++;
    cartBadge.textContent = cartCount;

    // Add animation feedback
    button.style.transform = "scale(1.2)";
    setTimeout(() => {
      button.style.transform = "";
    }, 200);

    // Optional: Show toast notification
    showToast("Added to cart!");
  });
});

// Toast Notification Function
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

// Intersection Observer for Scroll Animations
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

// Observe elements for scroll animations
document.querySelectorAll(".product-card, .brand-card").forEach((el) => {
  observer.observe(el);
});
