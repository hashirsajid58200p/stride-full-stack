import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import styles from "./ForgotPassword.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setFormError("");
    setIsSubmitting(true);

    try {
      if (!window.auth) {
        throw new Error("Authentication system not ready.");
      }

      await sendPasswordResetEmail(window.auth, email);

      if (window.showToast) {
        window.showToast("Password reset link sent to your email!", "success");
      }
      setEmail(""); // Clear the input on success
    } catch (error) {
      console.error("Reset Error:", error);

      if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else {
        setFormError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles["forgot-page-wrapper"]}>
      <div className={styles["centered-card"]}>
        <div className={styles["forgot-header"]}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email to receive a reset link.
          </p>
        </div>

        <form className={styles["forgot-form"]} onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(""); // Clear error on typing
              }}
              className={emailError ? styles.invalid : ""}
            />
            {emailError && (
              <span className={styles["input-error"]}>{emailError}</span>
            )}
          </div>

          {formError && <div className={styles["form-error"]}>{formError}</div>}

          <button
            type="submit"
            className={styles["submit-btn"]}
            disabled={isSubmitting}
          >
            {isSubmitting ? "SENDING..." : "SEND RESET LINK"}
          </button>

          <p className={styles["login-link"]}>
            Remember your password? <Link to="/login">Log In</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
