import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./FAQ.module.css";

const faqData = [
  {
    id: "shipping-orders",
    title: "Shipping & Orders",
    desc: "Everything you need to know about delivery and order tracking.",
    icon: "bi-box-seam",
    questions: [
      {
        q: "What is your shipping policy?",
        a: "We offer free standard shipping on all orders over $100. Standard shipping typically takes 5-7 business days. Express shipping options are available at checkout for faster delivery.",
      },
      {
        q: "How do I track my order?",
        a: "Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account and viewing your order history.",
      },
      {
        q: "Do you ship internationally?",
        a: "Yes, we ship to over 50 countries worldwide. International shipping costs and delivery times vary by location. Customs fees and duties are the responsibility of the customer.",
      },
      {
        q: "Can I cancel or modify my order?",
        a: "Orders can be cancelled or modified within 1 hour of placement. After that, the order enters our processing system and cannot be changed. Please contact customer service immediately if you need assistance.",
      },
    ],
  },
  {
    id: "returns-exchanges",
    title: "Returns & Exchanges",
    desc: "Information on returning or exchanging your purchases.",
    icon: "bi-arrow-counterclockwise",
    questions: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 30 days of purchase. Items must be unworn, in original condition with tags attached. Refunds will be processed within 5-10 business days of receiving the returned item.",
      },
    ],
  },
  {
    id: "products-sizing",
    title: "Products & Sizing",
    desc: "Find the perfect fit and verify authenticity.",
    icon: "bi-tag",
    questions: [
      {
        q: "How do I know what size to order?",
        a: "Each product page includes a detailed size guide. We recommend measuring your feet and comparing them to our size chart. If you're between sizes, we suggest ordering the larger size.",
      },
      {
        q: "Are your products authentic?",
        a: "Yes, all our products are 100% authentic and sourced directly from authorized distributors. Each item comes with a certificate of authenticity.",
      },
    ],
  },
  {
    id: "payments-support",
    title: "Payments & Support",
    desc: "Details on billing and contacting our team.",
    icon: "bi-credit-card",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay. All transactions are secured with SSL encryption.",
      },
      {
        q: "Do you offer gift wrapping?",
        a: "Yes, gift wrapping is available for $5 per item. You can select this option during checkout and include a personalized message.",
      },
      {
        q: "How can I contact customer service?",
        a: "You can reach our customer service team via email at support@stride.com, by phone at 1-800-STRIDE-123, or through our live chat feature. We're available Monday-Friday, 9 AM - 6 PM EST.",
      },
    ],
  },
];

const FaqItem = ({ question, answer, isOpen, onClick }) => {
  const contentRef = useRef(null);

  return (
    <div className={`${styles["faq-item"]} ${isOpen ? styles.active : ""}`}>
      <div className={styles["faq-question-header"]} onClick={onClick}>
        <span className={styles["faq-dot"]}></span>
        <h4 className={styles["faq-question"]}>{question}</h4>
        <i
          className={`bi ${isOpen ? "bi-dash-lg" : "bi-plus-lg"} ${styles["faq-toggle-icon"]}`}
        ></i>
      </div>
      <div
        className={styles["faq-answer"]}
        ref={contentRef}
        style={{
          maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px",
        }}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
};

export default function FAQ() {
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [activeLink, setActiveLink] = useState("shipping-orders");

  const handleJump = (e, id) => {
    e.preventDefault();
    setActiveLink(id);
    const targetElement = document.getElementById(id);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleToggle = (globalIndex) => {
    setActiveQuestion(activeQuestion === globalIndex ? null : globalIndex);
  };

  return (
    <main className={styles["faq-page-wrapper"]}>
      <section className={styles["faq-hero-section"]}>
        <div className="container">
          <div className={styles["faq-hero-top-content"]}>
            <h1 className={styles["faq-hero-main-heading"]}>
              Frequently Asked Questions
            </h1>
            <div className={styles["faq-hero-divider"]}></div>
            <div className={styles["faq-hero-person-info"]}>
              <Link to="/contact" aria-label="Contact Support">
                <img
                  src="/images/teammates/sarah.png"
                  alt="Sarah Chen - Support"
                  className={styles["faq-hero-avatar"]}
                />
              </Link>
              <div className={styles["faq-hero-person-details"]}>
                <h2 className={styles["faq-hero-person-name"]}>
                  Sarah Chen - Customer Experience Manager
                </h2>
                <p className={styles["faq-hero-person-description"]}>
                  Sneaker Enthusiast, 5+ years helping customers find their
                  perfect fit
                </p>
              </div>
            </div>
          </div>

          <div className={styles["faq-content-wrapper"]}>
            {/* Left Sidebar */}
            <div className={styles["faq-left-col"]}>
              <div className={styles["faq-jump-to-card"]}>
                <h3 className={styles["faq-jump-to-heading"]}>
                  Jump to Section:
                </h3>
                <div className={styles["faq-jump-to-divider"]}></div>
                <ul className={styles["faq-jump-to-list"]}>
                  {faqData.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`${styles["jump-link"]} ${activeLink === section.id ? styles.active : ""}`}
                        onClick={(e) => handleJump(e, section.id)}
                      >
                        <i
                          className={`bi ${section.icon} ${styles["faq-jump-to-icon"]}`}
                        ></i>
                        <span className={styles["faq-jump-to-text"]}>
                          {activeLink === section.id ? (
                            <strong>{section.title}</strong>
                          ) : (
                            section.title
                          )}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Content */}
            <div className={styles["faq-right-col"]}>
              {faqData.map((section, sIndex) => (
                <div
                  key={section.id}
                  id={section.id}
                  className={styles["faq-questions-card"]}
                >
                  <h3 className={styles["faq-questions-heading"]}>
                    {section.title}
                  </h3>
                  <p className={styles["faq-questions-paragraph"]}>
                    {section.desc}
                  </p>
                  <div className={styles["faq-questions-divider"]}></div>

                  {section.questions.map((item, qIndex) => {
                    // Create a unique global index so only ONE question opens globally, matching your vanilla JS exactly
                    const globalIndex = `${sIndex}-${qIndex}`;

                    return (
                      <React.Fragment key={globalIndex}>
                        <FaqItem
                          question={item.q}
                          answer={item.a}
                          isOpen={activeQuestion === globalIndex}
                          onClick={() => handleToggle(globalIndex)}
                        />
                        {/* Only render divider if it's NOT the last item in the section */}
                        {qIndex < section.questions.length - 1 && (
                          <div className={styles["faq-item-divider"]}></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Split Banner */}
      <section className={styles["faqc2-section"]}>
        <div className={styles["faqc2-content-row"]}>
          <div className={styles["faqc2-left-col"]}>
            <div className={styles["faqc2-left-content"]}>
              <h2 className={styles["faqc2-left-heading"]}>Need more help?</h2>
              <p className={styles["faqc2-left-paragraph"]}>
                Tell us what you need and get matched with the perfect pair or
                services in minutes.
              </p>
              <Link to="/products" className={styles["faqc2-button"]}>
                Find your best match
              </Link>
            </div>
          </div>

          <div className={styles["faqc2-right-col"]}>
            <div className={styles["faqc2-right-content"]}>
              <h2 className={styles["faqc2-right-heading"]}>
                Still have questions?
              </h2>
              <p className={styles["faqc2-right-paragraph"]}>
                We're here to help. Reach out to our friendly team at:{" "}
                <span className={styles["faqc2-email"]}>
                  support@stride.com
                </span>{" "}
                — we’d love to hear from you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
