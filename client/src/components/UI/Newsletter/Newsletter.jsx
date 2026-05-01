import React, { useState } from "react";
import styles from "./Newsletter.module.css";

export default function Newsletter({ bgImage }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'

  // Automatically override the default background if a prop is passed
  const sectionStyle = bgImage ? { backgroundImage: `url('${bgImage}')` } : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setStatus("loading");

    try {
      const response = await fetch(
        // Deployment Version
        // "/api/newsletter/subscribe",
        // Local Version
        "http://localhost:5000/api/newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Subscription failed");

      // Show success state
      setStatus("success");

      if (typeof window.showToast === "function") {
        window.showToast("Thank you for subscribing!", "success");
      }

      setEmail("");

      // Reset button after 3 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Newsletter Error:", error);

      // Show error state
      setStatus("error");

      if (typeof window.showToast === "function") {
        window.showToast(
          error.message || "Failed to subscribe. Please try again.",
          "error",
        );
      }

      // Reset border after 1.5 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 1500);
    }
  };

  // Dynamic styling mapping based on state
  const btnStyle = status === "success" ? { backgroundColor: "#10b981" } : {};
  const inputStyle = status === "error" ? { borderColor: "#ef4444" } : {};

  let btnText = "SUBSCRIBE";
  if (status === "loading") btnText = "SUBSCRIBING...";
  if (status === "success") btnText = "✓ SUBSCRIBED!";

  return (
    <section className={styles.newsletter} style={sectionStyle}>
      <div className={styles["newsletter-overlay"]}></div>
      <div className="container">
        <div className={styles["newsletter-content"]}>
          <p className={styles["newsletter-intro"]}>KEEP ME UPDATED</p>
          <h2 className={styles["newsletter-title"]}>NEWSLETTER</h2>
          <p className={styles["newsletter-text"]}>
            Receive exclusive promotions, private sales and news
          </p>

          <form className={styles["newsletter-form"]} onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="E-mail"
              className={styles["newsletter-input"]}
              aria-label="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              className={styles["submit-btn"]}
              disabled={status === "loading" || status === "success"}
              style={btnStyle}
            >
              {btnText}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
