import React, { useState } from "react";
import styles from "./Contact.module.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message.");
      }

      if (typeof window.showToast === "function") {
        window.showToast(
          "Message sent successfully! We will get back to you within 24 hours.",
          "success",
        );
      }

      // Reset form
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Contact Form Error:", error);
      if (typeof window.showToast === "function") {
        window.showToast(error.message, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to replicate the vanilla JS interactive underline on blur
  const getBorderStyle = (value) => {
    return { borderBottomColor: value.trim() !== "" ? "var(--color-fg)" : "" };
  };

  return (
    <main className={styles["contact-page-wrapper"]}>
      <section className={styles["contact-hero-section"]}>
        <div className="container">
          <div className={styles["contact-header-row"]}>
            <div className={styles["contact-text-col"]}>
              <p className={styles["contact-small-heading"]}>Contact Stride</p>
              <h1 className={styles["contact-main-heading"]}>
                Get in touch with us.
                <br />
                We're here to assist you.
              </h1>
            </div>

            <div className={styles["contact-social-col"]}>
              <a
                href="https://www.facebook.com/hashirsajid58200p/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["social-icon-circle"]}
                aria-label="Facebook"
              >
                <i className="bi bi-facebook"></i>
              </a>
              <a
                href="https://www.instagram.com/hashirsajid58200p/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["social-icon-circle"]}
                aria-label="Instagram"
              >
                <i className="bi bi-instagram"></i>
              </a>
              <a
                href="https://x.com/hs58200p"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["social-icon-circle"]}
                aria-label="Twitter"
              >
                <i className="bi bi-twitter-x"></i>
              </a>
            </div>
          </div>

          <form
            id="contactForm"
            className={styles["contact-form"]}
            onSubmit={handleSubmit}
          >
            <div className={styles["form-inputs-grid"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="name" className={styles["form-label"]}>
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  className={styles["form-control"]}
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  style={getBorderStyle(formData.name)}
                />
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="email" className={styles["form-label"]}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className={styles["form-control"]}
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  style={getBorderStyle(formData.email)}
                />
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="phone" className={styles["form-label"]}>
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  className={styles["form-control"]}
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={getBorderStyle(formData.phone)}
                />
              </div>

              <div
                className={`${styles["form-group"]} ${styles["full-width"]}`}
              >
                <label htmlFor="message" className={styles["form-label"]}>
                  Message
                </label>
                <textarea
                  id="message"
                  className={`${styles["form-control"]} ${styles["message-textarea"]}`}
                  required
                  value={formData.message}
                  onChange={handleInputChange}
                  style={getBorderStyle(formData.message)}
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className={styles["submit-message-btn"]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  Sending... <i className="bi bi-hourglass-split"></i>
                </>
              ) : (
                <>
                  Leave us a Message <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      <section className={styles["contact-info-section"]}>
        <div className="container">
          <div className={styles["contact-info-row"]}>
            <div className={styles["contact-info-left-col"]}>
              <p className={styles["contact-info-small-heading"]}>
                Contact Info
              </p>
              <h2 className={styles["contact-info-main-heading"]}>
                We are always happy
                <br />
                to assist you
              </h2>
            </div>

            <div className={styles["contact-info-right-col"]}>
              <div className={styles["contact-info-card"]}>
                <h3 className={styles["card-heading"]}>Email Address</h3>
                <div className={styles["card-divider"]}></div>
                <p className={styles["card-subheading"]}>support@stride.com</p>
                <p className={styles["card-paragraph"]}>
                  Assistance hours:
                  <br />
                  Monday - Friday 9 am to 6 pm EST
                </p>
              </div>

              <div className={styles["contact-info-card"]}>
                <h3 className={styles["card-heading"]}>Number</h3>
                <div className={styles["card-divider"]}></div>
                <p className={styles["card-subheading"]}>1-800-STRIDE-123</p>
                <p className={styles["card-paragraph"]}>
                  Assistance hours:
                  <br />
                  Monday - Friday 9 am to 6 pm EST
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
