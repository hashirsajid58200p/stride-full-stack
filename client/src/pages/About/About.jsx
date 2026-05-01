import React from "react";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import Newsletter from "../../components/UI/Newsletter";
import styles from "./About.module.css";

export default function About() {
  return (
    <>
      <main className={styles["about-page-wrapper"]}>
        <section className={styles["about-hero"]}>
          <div className={styles["hero-overlay"]}></div>
          <div className={`container ${styles["hero-content"]}`}>
            <h1 className={styles["hero-title"]}>About Stride</h1>
            <p className={styles["hero-subtitle"]}>
              Your destination for authentic footwear from the world's leading
              brands
            </p>
          </div>
        </section>

        <section className={styles["story-section"]}>
          <div className="container">
            <div className={styles["story-split"]}>
              <div className={styles["story-text-content"]}>
                <h2 className={styles["section-title"]}>Our Story</h2>
                <p className={styles["story-text"]}>
                  Founded in 2020, Stride began with a simple mission: to make
                  premium footwear accessible to everyone. What started as a
                  small online store has grown into a trusted destination for
                  shoe enthusiasts worldwide.
                </p>
                <p className={styles["story-text"]}>
                  We believe that the right pair of shoes can transform not just
                  your outfit, but your entire day. That's why we carefully
                  curate our collection from brands like Nike, Adidas, Puma, and
                  more, ensuring every step you take is comfortable, stylish,
                  and confident.
                </p>
              </div>

              <div className={styles["story-image-content"]}>
                <img
                  src="/images/backgrounds/about_section_1.jpg"
                  alt="Our Story"
                  className={styles["story-image"]}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles["values-section"]}>
          <div className="container">
            <div className={styles["values-grid"]}>
              <div className={styles["value-card"]}>
                <div className={styles["value-icon"]}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className={styles["value-title"]}>Our Mission</h3>
                <p className={styles["value-description"]}>
                  To provide premium footwear that combines style, comfort, and
                  performance for every lifestyle.
                </p>
              </div>

              <div className={styles["value-card"]}>
                <div className={styles["value-icon"]}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                </div>
                <h3 className={styles["value-title"]}>Quality First</h3>
                <p className={styles["value-description"]}>
                  We partner with top brands and ensure every product meets our
                  high standards of excellence.
                </p>
              </div>

              <div className={styles["value-card"]}>
                <div className={styles["value-icon"]}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <h3 className={styles["value-title"]}>Customer Focus</h3>
                <p className={styles["value-description"]}>
                  Your satisfaction is our priority. We're committed to
                  delivering exceptional service and products.
                </p>
              </div>

              <div className={styles["value-card"]}>
                <div className={styles["value-icon"]}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className={styles["value-title"]}>Community</h3>
                <p className={styles["value-description"]}>
                  Building a community of footwear enthusiasts who share our
                  passion for great shoes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles["team-section"]}>
          <div className="container">
            <div className={styles["team-header"]}>
              <h2 className={styles["section-title"]}>Meet Our Team</h2>
              <p className={styles["section-subtitle"]}>
                The passionate people behind Stride
              </p>
            </div>

            <div className={styles["team-grid"]}>
              <div className={styles["team-member"]}>
                <div className={styles["member-image"]}>
                  <img src="/images/teammates/hashir.png" alt="Hashir Sajid" />
                </div>
                <h3 className={styles["member-name"]}>Hashir Sajid</h3>
                <p className={styles["member-roll"]}>F22-BSIT-5061</p>
                <p className={styles["member-role"]}>
                  Project Manager & Full Stack Developer
                </p>
              </div>

              <div className={styles["team-member"]}>
                <div className={styles["member-image"]}>
                  <img
                    src="/images/teammates/ammara.png"
                    alt="Ammara Maqsood"
                  />
                </div>
                <h3 className={styles["member-name"]}>Ammara Maqsood</h3>
                <p className={styles["member-roll"]}>F22-BSIT-5048</p>
                <p className={styles["member-role"]}>
                  Documentation & Analysis Specialist
                </p>
              </div>

              <div className={styles["team-member"]}>
                <div className={styles["member-image"]}>
                  <img src="/images/teammates/shoaib.png" alt="Shoaib Akhtar" />
                </div>
                <h3 className={styles["member-name"]}>Shoaib Akhtar</h3>
                <p className={styles["member-roll"]}>F22-BSIT-5084</p>
                <p className={styles["member-role"]}>
                  Presentation & Testing Specialist
                </p>
              </div>
            </div>
          </div>
        </section>

        <Newsletter bgImage="/images/backgrounds/newsletter_about_background.jpg" />
      </main>
    </>
  );
}
