// Import the persistence functions directly from Firebase
import {
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// NEW: Import Realtime Database functions
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// FIX: Removed the old static import for profileLoader.

window.addEventListener("firebaseInitialized", () => {
  // Initialize Realtime Database
  const db = getDatabase();

  // Function to clear all inline errors
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

  // Function to show error under a specific input field
  function showFieldError(inputId, message) {
    const inputElement = document.getElementById(inputId);
    const errorElement = document.getElementById(`${inputId}-error`);

    if (inputElement && errorElement) {
      inputElement.classList.add("invalid");
      errorElement.textContent = message;
      errorElement.classList.add("show");
    }
  }

  // Function to show a general form error
  function showFormError(message) {
    const formErrorElement = document.getElementById("form-error");
    if (formErrorElement) {
      formErrorElement.textContent = message;
      formErrorElement.classList.add("show");
    }
  }

  document
    .getElementById("loginForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      // Clear previous errors on new submission
      clearErrors();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const rememberMe = document.getElementById("remember").checked; // Get checkbox state

      // Optional frontend validation before sending to Firebase
      if (password.length < 6) {
        showFieldError("password", "Password must be at least 6 characters.");
        return;
      }

      try {
        // 1. Set Firebase Persistence based on the "Remember me" checkbox
        const persistenceType = rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence;
        await setPersistence(window.auth, persistenceType);

        // 2. Sign in with Firebase (Frontend)
        const userCredential = await window.signInWithEmailAndPassword(
          window.auth,
          email,
          password,
        );
        const user = userCredential.user;

        // 3. Get the secure ID Token from Firebase
        const idToken = await user.getIdToken();

        // 4. Send the token to your Node.js Server
        const response = await fetch("http://localhost:5000/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const result = await response.json();

        if (response.ok) {
          // 5. Query Realtime Database for the user's role
          const roleRef = ref(db, `users/${user.uid}/role`);
          const snapshot = await get(roleRef);

          let userRole = "client"; // Default if not found
          if (snapshot.exists()) {
            userRole = snapshot.val();
          }

          // 6. Redirect based on their role
          if (userRole === "admin") {
            localStorage.setItem("userRole", "admin");
            showToast("Admin access granted!", "success");
            setTimeout(
              () => (window.location.href = "adminDashboard.html"),
              2000,
            );
          } else {
            localStorage.setItem("userRole", "client");
            showToast("Welcome back to Stride!", "success");
            setTimeout(
              () => (window.location.href = "userDashboard.html"), // Updated redirect!
              2000,
            );
          }
        } else {
          throw new Error(result.error || "Server verification failed");
        }
      } catch (error) {
        console.error("Auth Error:", error);

        // Handle Firebase Auth Errors Intelligently
        if (error.code === "auth/invalid-credential") {
          // Highlight both fields since we don't know which is wrong, but put the message under password
          document.getElementById("email").classList.add("invalid");
          showFieldError(
            "password",
            "Invalid email or password. Please try again.",
          );
        } else if (error.code === "auth/invalid-email") {
          showFieldError("email", "Please enter a valid email address.");
        } else if (error.code === "auth/too-many-requests") {
          showFormError("Too many failed attempts. Please try again later.");
        } else if (error.code === "auth/network-request-failed") {
          showFormError(
            "Network error. Please check your internet connection.",
          );
        } else {
          showFormError("An unexpected error occurred. Please try again.");
        }
      }
    });

  // Google Login Handler
  const googleBtn = document.getElementById("googleLogin");
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      clearErrors();
      try {
        const userCredential = await window.signInWithPopup(
          window.auth,
          window.googleProvider,
        );
        const user = userCredential.user;

        const idToken = await user.getIdToken();

        const response = await fetch("http://localhost:5000/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const result = await response.json();

        if (response.ok) {
          // Query Realtime Database for the user's role
          const roleRef = ref(db, `users/${user.uid}/role`);
          const snapshot = await get(roleRef);

          let userRole = "client"; // Default if not found
          if (snapshot.exists()) {
            userRole = snapshot.val();
          }

          // Redirect based on their role
          if (userRole === "admin") {
            localStorage.setItem("userRole", "admin");
            showToast("Admin access granted!", "success");
            setTimeout(
              () => (window.location.href = "adminDashboard.html"),
              2000,
            );
          } else {
            localStorage.setItem("userRole", "client");
            showToast("Welcome back to Stride!", "success");
            setTimeout(
              () => (window.location.href = "userDashboard.html"), // Updated redirect!
              2000,
            );
          }
        } else {
          throw new Error(result.error || "Server verification failed");
        }
      } catch (error) {
        console.error("Google Login Error:", error);
        if (error.code === "auth/popup-closed-by-user") {
          showFormError("Google sign-in was canceled.");
        } else {
          showFormError("Google Log-In failed. Please try again.");
        }
      }
    });
  }

  // Helper function for Toasts
  function showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.borderLeftColor = type === "success" ? "#4CAF50" : "#f44336";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }
});
