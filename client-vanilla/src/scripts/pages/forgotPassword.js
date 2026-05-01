import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

function clearErrors() {
  document
    .querySelectorAll(".invalid")
    .forEach((el) => el.classList.remove("invalid"));
  document
    .querySelectorAll(".input-error.show, .form-error.show")
    .forEach((el) => {
      el.classList.remove("show");
      el.textContent = "";
    });
}

function showFieldError(inputId, message) {
  const inputElement = document.getElementById(inputId);
  const errorElement = document.getElementById(`${inputId}-error`);

  if (inputElement && errorElement) {
    inputElement.classList.add("invalid");
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }
}

function showFormError(message) {
  const formErrorElement = document.getElementById("form-error");
  if (formErrorElement) {
    formErrorElement.textContent = message;
    formErrorElement.classList.add("show");
  }
}

function showToast(message, type) {
  if (window.showToast) window.showToast(message, type);
}

document
  .getElementById("forgotForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById("email").value;

    try {
      // window.auth is initialized in your main.js
      await sendPasswordResetEmail(window.auth, email);

      showToast("Password reset link sent to your email!", "success");
      document.getElementById("email").value = "";
    } catch (error) {
      console.error("Reset Error:", error);

      if (error.code === "auth/invalid-email") {
        showFieldError("email", "Please enter a valid email address.");
      } else {
        showFormError("Failed to send reset email. Please try again.");
      }
    }
  });
