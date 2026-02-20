// Newsletter subscription interaction
const subscribeBtn = document.getElementById("subscribeBtn");
const emailInput = document.getElementById("emailInput");

if (subscribeBtn && emailInput) {
  subscribeBtn.addEventListener("click", () => {
    const email = emailInput.value;

    if (email && email.includes("@")) {
      // Show success message
      const originalText = subscribeBtn.textContent;
      subscribeBtn.textContent = "✓ SUBSCRIBED!";
      subscribeBtn.style.backgroundColor = "#10b981"; // Success Green

      // Clear input
      emailInput.value = "";

      // Show global toast if it exists (Optional enhancement)
      if (typeof showToast === "function") {
        showToast("Thank you for subscribing!");
      }

      // Reset button after 3 seconds
      setTimeout(() => {
        subscribeBtn.textContent = originalText;
        subscribeBtn.style.backgroundColor = "var(--color-accent)";
      }, 3000);
    } else {
      // Show error state
      emailInput.style.borderColor = "#ef4444"; // Error Red

      if (typeof showToast === "function") {
        showToast("Please enter a valid email address.");
      }

      setTimeout(() => {
        emailInput.style.borderColor = "rgba(255, 255, 255, 0.5)";
      }, 1500);
    }
  });

  // Allow enter key to submit
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      subscribeBtn.click();
    }
  });
}
