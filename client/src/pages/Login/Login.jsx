import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import styles from "./Login.module.css";
import CustomCheckbox from "../../components/UI/CustomCheckbox";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearErrors = () => setErrors({ email: "", password: "", form: "" });

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
    clearErrors();
  };

  const processLoginResult = async (user) => {
    try {
      const idToken = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Server verification failed");
      }

      const db = getDatabase();
      const roleRef = ref(db, `users/${user.uid}/role`);
      const snapshot = await get(roleRef);

      let userRole = "client";
      if (snapshot.exists()) {
        userRole = snapshot.val();
      }

      if (userRole === "admin") {
        localStorage.setItem("userRole", "admin");
        if (window.showToast)
          window.showToast("Admin access granted!", "success");
        setTimeout(() => navigate("/admin-dashboard"), 2000);
      } else {
        localStorage.setItem("userRole", "client");
        if (window.showToast)
          window.showToast("Welcome back to Stride!", "success");
        setTimeout(() => navigate("/user-dashboard"), 2000);
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setErrors((prev) => ({
        ...prev,
        form: error.message || "Server verification failed.",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    if (formData.password.length < 6) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 6 characters.",
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      if (!window.auth) throw new Error("Authentication system not ready.");

      const persistenceType = formData.rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(window.auth, persistenceType);

      const userCredential = await signInWithEmailAndPassword(
        window.auth,
        formData.email,
        formData.password,
      );
      await processLoginResult(userCredential.user);
    } catch (error) {
      console.error("Auth Error:", error);
      if (error.code === "auth/invalid-credential") {
        setErrors((prev) => ({
          ...prev,
          email: " ",
          password: "Invalid email or password. Please try again.",
        }));
      } else if (error.code === "auth/invalid-email") {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
      } else if (error.code === "auth/too-many-requests") {
        setErrors((prev) => ({
          ...prev,
          form: "Too many failed attempts. Please try again later.",
        }));
      } else if (error.code === "auth/network-request-failed") {
        setErrors((prev) => ({
          ...prev,
          form: "Network error. Please check your internet connection.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: "An unexpected error occurred. Please try again.",
        }));
      }
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearErrors();
    setIsSubmitting(true);
    try {
      if (!window.auth || !window.googleProvider)
        throw new Error("Google Auth not ready.");

      const userCredential = await signInWithPopup(
        window.auth,
        window.googleProvider,
      );
      await processLoginResult(userCredential.user);
    } catch (error) {
      console.error("Google Login Error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setErrors((prev) => ({
          ...prev,
          form: "Google sign-in was canceled.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: "Google Log-In failed. Please try again.",
        }));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles["login-page-wrapper"]}>
      <div className={styles["split-card"]}>
        <div className={styles["split-card-left"]}>
          <div className={styles["login-header"]}>
            <h1 className={styles.title}>Login</h1>
            <p className={styles.subtitle}>
              Hi, Welcome back
              <img
                src="/images/logos/login.png"
                alt="Robot Icon"
                className={styles["welcome-icon"]}
              />
            </p>
          </div>

          <form className={styles["login-form"]} onSubmit={handleSubmit}>
            <div className={styles["form-group"]}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? styles.invalid : ""}
              />
              {errors.email && (
                <span className={`${styles["input-error"]} ${styles.show}`}>
                  {errors.email}
                </span>
              )}
            </div>

            <div className={styles["form-group"]}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? styles.invalid : ""}
              />
              {errors.password && (
                <span className={`${styles["input-error"]} ${styles.show}`}>
                  {errors.password}
                </span>
              )}
            </div>

            <div className={styles["form-options"]}>
              <div className={styles["checkbox-group"]}>
                <CustomCheckbox
                  id="rememberMe"
                  label="Remember me"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
              </div>
              <Link to="/forgot-password" className={styles["forgot-link"]}>
                Forgot Password?
              </Link>
            </div>

            {errors.form && (
              <div className={`${styles["form-error"]} ${styles.show}`}>
                {errors.form}
              </div>
            )}

            <button
              type="submit"
              className={styles["submit-btn"]}
              disabled={isSubmitting}
            >
              {isSubmitting ? "LOGGING IN..." : "LOGIN"}
            </button>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <div className={styles["social-login"]}>
              <button
                type="button"
                className={styles["social-btn"]}
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <i className="bi bi-google"></i> Continue with Google
              </button>
            </div>

            <p className={styles["signup-link"]}>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </form>
        </div>

        <div className={styles["split-card-right"]}></div>
      </div>
    </main>
  );
}
