document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Gather form data
      const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        message: document.getElementById("message").value,
      };

      // Log for testing
      console.log("Message Ready to Send:", formData);

      // Show Success Toast
      showToast(
        "Message sent successfully! We will get back to you within 24 hours.",
      );

      // Reset the form fields
      contactForm.reset();
    });
  }

  // Interactive underline effect for inputs
  const formInputs = document.querySelectorAll(".form-control");
  formInputs.forEach((input) => {
    // When input is not empty, ensure border stays accented
    input.addEventListener("blur", () => {
      if (input.value.trim() !== "") {
        input.style.borderBottomColor = "var(--color-fg)";
      } else {
        input.style.borderBottomColor = "var(--color-border)";
      }
    });
  });

  // Custom Toast Function
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");

      // Remove after 3 seconds
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    }
  }
});
