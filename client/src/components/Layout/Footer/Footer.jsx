import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isHeartFilled, setIsHeartFilled] = useState(false);
  const [accountRoute, setAccountRoute] = useState(
    "/user-dashboard?view=profile",
  );

  // Dynamic Routing and Global Script Initialization
  useEffect(() => {
    // 0. Dynamic Account Routing
    if (localStorage.getItem("userRole") === "admin") {
      setAccountRoute("/admin-dashboard?view=profile");
    }

    // 1. Dynamic Year Logic (Ensures it stays current)
    setCurrentYear(new Date().getFullYear());

    // ==========================================
    // PORTED GLOBAL FUNCTIONS
    // ==========================================
    if (!window.showToast) {
      window.showToast = function (message, type = "info") {
        const existingToast = document.querySelector(".toast");
        if (existingToast) existingToast.remove();

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: var(--color-primary);
          color: var(--color-primary-fg);
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          animation: slideUp 0.3s ease-out;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(20px)";
          toast.style.transition = "all 0.3s ease-out";
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      };
    }

    if (!window.observer) {
      window.observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      };

      window.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      }, window.observerOptions);
    }

    // Safety timeout to catch elements rendered slightly after mount
    setTimeout(() => {
      document.querySelectorAll(".product-card, .brand-card").forEach((el) => {
        if (window.observer) window.observer.observe(el);
      });
    }, 100);
  }, []);

  const toggleHeart = () => {
    setIsHeartFilled(!isHeartFilled);
  };

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles["footer-top"]}>
          <div className={styles["footer-brand-section"]}>
            <Link to="/">
              <img
                src="/images/logos/stride_logo_dark.png"
                alt="Stride Logo"
                className={`${styles["footer-logo"]} ${styles["logo-for-dark-bg"]}`}
              />
              <img
                src="/images/logos/stride_logo_light.png"
                alt="Stride Logo"
                className={`${styles["footer-logo"]} ${styles["logo-for-light-bg"]}`}
              />
            </Link>
            <p className={styles["footer-description"]}>
              Your destination for authentic sneakers from the world's leading
              brands.
            </p>
          </div>

          <div className={styles["footer-links-grid"]}>
            <div className={styles["footer-column"]}>
              <h4 className={styles["footer-title"]}>Quick Links</h4>
              <ul className={styles["footer-links"]}>
                <li>
                  <Link to={accountRoute}>My Account</Link>
                </li>
                <li>
                  <Link to="/products">Products</Link>
                </li>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
              </ul>
            </div>

            <div className={styles["footer-column"]}>
              <h4 className={styles["footer-title"]}>Customer Service</h4>
              <ul className={styles["footer-links"]}>
                <li>
                  <Link to="/contact">Contact Us</Link>
                </li>
                <li>
                  <Link to="/returns-exchanges">Return & Exchange</Link>
                </li>
                <li>
                  <Link to="/privacy-policy">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
              </ul>
            </div>

            <div className={styles["footer-column"]}>
              <h4 className={styles["footer-title"]}>Menu</h4>
              <ul className={styles["footer-links"]}>
                <li>
                  <Link to="/products?category=new-arrival">New Arrivals</Link>
                </li>
                <li>
                  <Link to="/products?category=men">Men</Link>
                </li>
                <li>
                  <Link to="/products?category=women">Women</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles["footer-middle"]}>
          <div className={styles["footer-social"]}>
            <h4 className={styles["footer-title"]}>Follow Us</h4>
            <div className={styles["social-icons"]}>
              <a
                href="https://www.facebook.com/hashirsajid58200p/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <i className="bi bi-facebook"></i>
              </a>
              <a
                href="https://www.instagram.com/hashirsajid58200p/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="bi bi-instagram"></i>
              </a>
              <a
                href="https://x.com/hs58200p"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X Twitter"
              >
                <i className="bi bi-twitter-x"></i>
              </a>
              <a
                href="https://www.tiktok.com/@hashirsajid58200p"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <i className="bi bi-tiktok"></i>
              </a>
              <a
                href="https://www.youtube.com/@hashirsajid58200p"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <i className="bi bi-youtube"></i>
              </a>
            </div>
          </div>

          <div className={styles["footer-payments"]}>
            <img src="/images/logos/payments/jazzcash.png" alt="JazzCash" />
            <img src="/images/logos/payments/easypaisa.webp" alt="EasyPaisa" />
            <img src="/images/logos/payments/baadmay.svg" alt="Baadmay" />
            <img
              src="/images/logos/payments/mastercard.webp"
              alt="Mastercard"
            />
            <img src="/images/logos/payments/visa.webp" alt="Visa" />
            <img src="/images/logos/payments/unionpay.webp" alt="UnionPay" />
          </div>
        </div>

        <div className={styles["footer-bottom"]}>
          <p>
            &copy; <span>{currentYear}</span> - Stride - Made with
            <i
              className={`bi ${isHeartFilled ? `bi-heart-fill ${styles.filled}` : "bi-heart"} ${styles["heart-icon"]}`}
              onClick={toggleHeart}
            ></i>{" "}
            by
            <a
              href="https://github.com/hashirsajid58200p"
              target="_blank"
              rel="noopener noreferrer"
              className={styles["creator-name"]}
              data-fullname="Hashir Sajid"
            >
              HS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
