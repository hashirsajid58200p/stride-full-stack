import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import styles from "./Signup.module.css";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    address: "",
    postalCode: "",
    password: "",
    newsletter: false,
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!formData.terms) {
      if (window.showToast)
        window.showToast("Please agree to the terms and conditions", "error");
      return;
    }

    if (formData.password.length < 6) {
      if (window.showToast)
        window.showToast("Password must be at least 6 characters", "error");
      return;
    }

    setIsSubmitting(true);
    const db = getDatabase();

    try {
      if (!window.auth) throw new Error("Authentication system not ready.");

      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(
        window.auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      // 2. Attach Full Name
      await updateProfile(user, { displayName: formData.fullName });

      // 3. Write default role to RTDB
      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, { role: "client" });

      // 4. Save Extra Details Locally
      const extraUserData = {
        phone: formData.mobile,
        address: formData.address,
        postalCode: formData.postalCode,
      };
      localStorage.setItem(
        `stride_profile_${user.uid}`,
        JSON.stringify(extraUserData),
      );

      if (window.showToast)
        window.showToast("Account created successfully!", "success");

      // 5. Redirect
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Signup Error:", error);
      let errorMessage = "Failed to create account.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
      }
      if (window.showToast) window.showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    const db = getDatabase();

    try {
      if (!window.auth || !window.googleProvider)
        throw new Error("Google Auth not ready.");

      const userCredential = await signInWithPopup(
        window.auth,
        window.googleProvider,
      );
      const user = userCredential.user;

      // Ensure we don't overwrite an existing admin
      const roleRef = ref(db, `users/${user.uid}/role`);
      const snapshot = await get(roleRef);

      if (!snapshot.exists()) {
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, { role: "client" });
      }

      if (window.showToast)
        window.showToast("Google account linked successfully!", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Google Signup Error:", error);
      if (window.showToast) window.showToast("Google Sign-Up failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles["signup-page-wrapper"]}>
      <div className={styles["split-card"]}>
        <div className={styles["split-card-left"]}>
          <div className={styles["signup-header"]}>
            <h1 className={styles.title}>Sign Up</h1>
            <p className={styles.subtitle}>
              Enter details to create an account
              <img
                src="/images/logos/signup.png"
                alt="Signup Icon"
                className={styles["welcome-icon"]}
              />
            </p>
          </div>

          <form className={styles["signup-form"]} onSubmit={handleSignup}>
            <div className={styles["form-row"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="mobile">Mobile</label>
                <input
                  type="tel"
                  id="mobile"
                  required
                  value={formData.mobile}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles["form-group"]}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className={styles["form-row"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles["form-group"]}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <div className={styles["form-options"]}>
              <div className={styles["checkbox-group"]}>
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={formData.newsletter}
                  onChange={handleInputChange}
                />
                <label htmlFor="newsletter">Subscribe to newsletter</label>
              </div>

              <div className={styles["checkbox-group"]}>
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={formData.terms}
                  onChange={handleInputChange}
                />
                <label htmlFor="terms">
                  I have read, understood and agree to be bound by Stride's
                  Privacy Policy and Terms of Use
                </label>
              </div>
            </div>

            <button
              type="submit"
              className={styles["submit-btn"]}
              disabled={isSubmitting}
            >
              {isSubmitting ? "PROCESSING..." : "SIGN UP"}
            </button>

            <p className={styles["login-link"]}>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            <div className={styles.divider}>
              <span>OR Continue with</span>
            </div>

            <div className={styles["social-login-row"]}>
              <button
                type="button"
                className={styles["social-btn-icon"]}
                onClick={handleGoogleSignup}
                disabled={isSubmitting}
                aria-label="Sign up with Google"
              >
                <i className="bi bi-google"></i>
              </button>
            </div>
          </form>
        </div>

        <div className={styles["split-card-right"]}></div>
      </div>
    </main>
  );
}
