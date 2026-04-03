document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");
  const submitBtn = document.querySelector(".submit-message-btn");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Gather form data
      const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        message: document.getElementById("message").value.trim(),
      };

      // UI Loading State (Prevent double clicks)
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = `Sending... <i class="bi bi-hourglass-split"></i>`;
      submitBtn.disabled = true;

      try {
        // Send data to your new Node.js backend route
        const response = await fetch("http://localhost:5000/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to send message.");
        }

        // Show Success Toast using the Global Component
        if (typeof window.showToast === "function") {
          window.showToast(
            "Message sent successfully! We will get back to you within 24 hours.",
            "success",
          );
        }

        // Reset the form fields
        contactForm.reset();

        // Reset the CSS border styling for the inputs
        const formInputs = document.querySelectorAll(".form-control");
        formInputs.forEach((input) => {
          input.style.borderBottomColor = "var(--color-border)";
        });
      } catch (error) {
        console.error("Contact Form Error:", error);
        if (typeof window.showToast === "function") {
          window.showToast(error.message, "error");
        }
      } finally {
        // Restore Button State regardless of success or failure
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
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
});
