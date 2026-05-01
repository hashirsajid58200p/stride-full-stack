import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// NEW: Import Realtime Database functions
import {
  getDatabase,
  ref,
  set,
  get,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const initSignup = () => {
  // Initialize Database
  const db = getDatabase();

  document
    .getElementById("signupForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      // Get form values
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const fullName = document.getElementById("fullName").value;
      const mobile = document.getElementById("mobile").value;
      const address = document.getElementById("address").value;
      const postalCode = document.getElementById("postalCode").value;
      const terms = document.getElementById("terms").checked;

      // 1. Validation check
      if (!terms) {
        showToast("Please agree to the terms and conditions", "error");
        return;
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
      }

      try {
        // 2. Create User in Firebase Authentication
        const userCredential = await window.createUserWithEmailAndPassword(
          window.auth,
          email,
          password,
        );
        const user = userCredential.user;

        // 3. Attach the Full Name directly to the Firebase profile
        await updateProfile(user, {
          displayName: fullName,
        });

        // 4. WRITE DEFAULT ROLE TO DATABASE
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, { role: "client" });

        // 5. Save Extra User Details locally (bridging gap until Supabase is active)
        const extraUserData = {
          phone: mobile,
          address: address,
          postalCode: postalCode,
        };
        localStorage.setItem(
          `stride_profile_${user.uid}`,
          JSON.stringify(extraUserData),
        );

        console.log("Firebase user created successfully:", user.uid);

        // 6. Success Feedback
        showToast("Account created successfully!", "success");

        // 7. Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } catch (error) {
        console.error("Signup Error:", error.code, error.message);

        // Handle specific Firebase error messages for better UX
        let errorMessage = "Failed to create account.";
        if (error.code === "auth/email-already-in-use") {
          errorMessage = "This email is already in use.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Please enter a valid email address.";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "The password is too weak.";
        }

        showToast(errorMessage, "error");
      }
    });

  // Google Sign Up Handler
  const googleBtn = document.getElementById("googleSignUp");
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const userCredential = await window.signInWithPopup(
          window.auth,
          window.googleProvider,
        );
        const user = userCredential.user;

        // Ensure we don't overwrite an existing admin who signs in with Google
        const roleRef = ref(db, `users/${user.uid}/role`);
        const snapshot = await get(roleRef);

        if (!snapshot.exists()) {
          // Only write 'client' if they don't have a role yet (brand new Google signup)
          const userRef = ref(db, `users/${user.uid}`);
          await set(userRef, { role: "client" });
        }

        showToast("Google account linked successfully!", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } catch (error) {
        console.error("Google Signup Error:", error);
        showToast("Google Sign-Up failed", "error");
      }
    });
  }

  function showToast(message, type) {
    if (window.showToast) window.showToast(message, type);
  }
};

if (window.auth) {
  initSignup();
} else {
  window.addEventListener("firebaseInitialized", initSignup);
}
