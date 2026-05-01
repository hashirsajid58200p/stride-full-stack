import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ProductCards from "../../components/ECommerce/ProductCards";
import SkeletonAnimation from "../../components/UI/SkeletonAnimation";
import Newsletter from "../../components/UI/Newsletter";
import styles from "./Home.module.css";

// Brand Logo Data Arrays
const brandRow1 = [
  "nike",
  "adidas",
  "puma",
  "reebok",
  "underarmour",
  "newbalance",
  "onrunning",
  "converse",
  "vans",
  "jordan",
];
const brandRow2 = [
  "fila",
  "brooks",
  "saucony",
  "asics",
  "hokaoneone",
  "columbia",
  "thenorthface",
  "salomon",
  "merrell",
  "timberland",
];
const brandRow3 = [
  "ecco",
  "kswiss",
  "champion",
  "lotto",
  "diadora",
  "mizuno",
  "altra",
  "vibram",
  "camper",
  "superga",
];

// Testimonial Data
const testimonials = [
  {
    name: "AHMAD SAEED KHAN",
    text: "Very comfortable and perfect for everyday wear. Great quality",
  },
  { name: "HAMDAAN", text: "Perfect mix of casual and formal" },
  {
    name: "ALI ZAIDI",
    text: "I wear them every day to work. Still feel like new",
  },
  { name: "ZUNAIR KHAN", text: "Great value for money" },
  {
    name: "SUBHAN",
    text: "Perfect for office and casual wear. I'm really happy with the purchase",
  },
  {
    name: "SAMEEN RUDABA",
    text: "Didn't expect this level of comfort. Really impressed",
  },
  {
    name: "SALMAN WATTO",
    text: "Stride never disappoint. This pair is my new favorite",
  },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const hasFetched = useRef(false); // Ref to prevent double-shuffle in Strict Mode

  const brandRow1Ref = useRef(null);
  const brandRow2Ref = useRef(null);
  const brandRow3Ref = useRef(null);
  const testimonialTrackRef = useRef(null);

  // ==========================================
  // FETCH FEATURED PRODUCTS FROM SUPABASE
  // ==========================================
  useEffect(() => {
    const fetchProducts = async () => {
      if (hasFetched.current) return; // Skip if already started
      hasFetched.current = true;

      try {
        if (!window.supabase) {
          throw new Error("Database not connected.");
        }

        const { data, error } = await window.supabase
          .from("products")
          .select(`*, product_sizes ( size ), reviews ( rating )`);

        if (error) throw error;

        if (data && data.length > 0) {
          // Shuffle and pick exactly 6
          const shuffled = data.sort(() => 0.5 - Math.random());
          setFeaturedProducts(shuffled.slice(0, 6));
        }
      } catch (err) {
        console.error("Error fetching featured products:", err);
        setFetchError("Failed to load featured products.");
      } finally {
        setIsLoading(false);
      }
    };

    if (window.supabase) {
      fetchProducts();
    } else {
      const initHandler = () => fetchProducts();
      window.addEventListener("supabaseInitialized", initHandler);
      return () =>
        window.removeEventListener("supabaseInitialized", initHandler);
    }
  }, []);

  // ==========================================
  // BRAND SHOWCASE: FLAWLESS JS CIRCULAR SCROLL
  // ==========================================
  useEffect(() => {
    const rows = [brandRow1Ref.current, brandRow2Ref.current, brandRow3Ref.current];
    const animationFrames = [];

    rows.forEach((row, index) => {
      if (!row) return;
      const track = row.querySelector(`.${styles["marquee-track"]}`);
      if (!track) return;

      let isHovered = false;

      // Delay ensures DOM is painted and scrollWidth is accurate
      setTimeout(() => {
        const halfWidth = track.scrollWidth / 2;
        const speedAmt = halfWidth / (200 * 60);
        const speeds = [-speedAmt, speedAmt, -speedAmt];
        const speed = speeds[index]; // Row 1 & 3 reverse, Row 2 normal

        let currentScroll = row.scrollLeft;
        if (speed < 0) {
          currentScroll = halfWidth;
          row.scrollLeft = currentScroll;
        }

        const handleMouseEnter = () => (isHovered = true);
        const handleMouseLeave = () => (isHovered = false);
        const handleScroll = () => {
          if (isHovered) currentScroll = row.scrollLeft;
        };

        row.addEventListener("mouseenter", handleMouseEnter);
        row.addEventListener("mouseleave", handleMouseLeave);
        row.addEventListener("scroll", handleScroll);

        function autoScroll() {
          if (!isHovered) {
            currentScroll += speed;
            if (speed > 0 && currentScroll >= halfWidth) {
              currentScroll -= halfWidth;
            } else if (speed < 0 && currentScroll <= 0) {
              currentScroll += halfWidth;
            }
            row.scrollLeft = currentScroll;
          }
          animationFrames[index] = requestAnimationFrame(autoScroll);
        }
        animationFrames[index] = requestAnimationFrame(autoScroll);
      }, 200);
    });

    return () => {
      animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    };
  }, []);

  // ==========================================
  // TESTIMONIALS CAROUSEL LOGIC
  // ==========================================
  const scrollTestimonials = (direction) => {
    if (testimonialTrackRef.current) {
      const card = testimonialTrackRef.current.querySelector(
        `.${styles["testimonial-card"]}`,
      );
      if (card) {
        const gap =
          parseInt(window.getComputedStyle(testimonialTrackRef.current).gap) ||
          0;
        const scrollAmount = card.offsetWidth + gap;
        testimonialTrackRef.current.scrollBy({
          left: direction === "next" ? scrollAmount : -scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <main>
      {/* HERO SECTION */}
      <section className={styles.hero}>
        <video className={styles["hero-video"]} autoPlay muted loop playsInline>
          <source src="/videos/hero_background.mp4" type="video/mp4" />
        </video>
        <img
          src="/images/backgrounds/hero_background_mobile.jpg"
          alt="Stride Hero"
          className={styles["hero-mobile-img"]}
        />

        <div className="container">
          <div className={styles["hero-content"]}>
            <h1 className={styles["hero-title"]}>
              Step Into{" "}
              <span className={styles["hero-accent"]}>Excellence</span>
            </h1>
            <p className={styles["hero-text"]}>
              Discover the latest collection from Nike, Adidas, and premium
              brands. Elevate your style with authentic sneakers.
            </p>
            <div className={styles["hero-buttons"]}>
              <Link
                to="/about"
                className={`${styles.btn} ${styles["btn-outline"]}`}
              >
                Our Story
              </Link>
              <Link
                to="/products"
                className={`${styles.btn} ${styles["btn-primary"]}`}
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
        <div className={styles["hero-gradient"]}></div>
      </section>

      {/* HERO MARQUEE */}
      <div className={styles["hero-marquee"]}>
        <div className={styles["hero-marquee-track"]}>
          {/* Render 10 times to ensure CSS infinite scroll works on ultrawide monitors */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={styles["hero-marquee-content"]}
              aria-hidden={i > 0 ? "true" : "false"}
            >
              <Link to="/products?category=new-arrival">New Arrivals</Link>
              <Link to="/products?category=men">Shop Men</Link>
              <Link to="/products?category=women">Shop Women</Link>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED PRODUCTS */}
      <section className={styles["featured-products"]}>
        <div className="container">
          <div className={styles["section-header"]}>
            <h2 className={styles["section-title"]}>Featured Collection</h2>
            <p className={styles["section-text"]}>
              Handpicked selection of the season's most coveted sneakers
            </p>
          </div>

          <div className={styles["products-grid"]}>
            {isLoading ? (
              <SkeletonAnimation count={6} />
            ) : fetchError ? (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "#ef4444",
                }}
              >
                {fetchError}
              </div>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((p, i) => (
                <ProductCards key={p.id} product={p} index={i} />
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "var(--color-muted-fg)",
                }}
              >
                No products found.
              </div>
            )}
          </div>

          <div className={styles["view-all-container"]}>
            <Link to="/products" className={styles["btn-view-all"]}>
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* TEXT MARQUEE */}
      <section className={styles["text-marquee"]}>
        <div className={styles["text-marquee-track"]}>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={styles["text-marquee-content"]}
              aria-hidden={i > 0 ? "true" : "false"}
            >
              <span>BUY NOW PAY LATER</span>
              <span>FREE SHIPPING ON ALL ORDERS</span>
            </div>
          ))}
        </div>
      </section>

      {/* BRAND SHOWCASE */}
      <section className={styles["brand-showcase"]}>
        <div className="container-fluid" style={{ width: "100%", padding: 0 }}>
          <div className={styles["section-header"]}>
            <h2 className={styles["section-title"]}>Shop by Brand</h2>
            <p className={styles["section-text"]}>
              Explore collections from the world's most iconic sneaker brands
            </p>
          </div>

          <div className={styles["marquee-wrapper"]}>
            {/* ROW 1 */}
            <div
              className={`${styles["marquee-row"]} ${styles.reverse}`}
              ref={brandRow1Ref}
            >
              <div className={styles["marquee-track"]}>
                {[...Array(8)].map((_, arrayIdx) => (
                  <div
                    key={arrayIdx}
                    className={styles["marquee-content"]}
                    aria-hidden={arrayIdx > 0 ? "true" : "false"}
                  >
                    {brandRow1.map((brand) => (
                      <div key={brand} className={styles["brand-card-mini"]}>
                        <img
                          src={`/images/logos/brands/${brand}.png`}
                          alt={brand}
                          className={styles["brand-icon"]}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 2 */}
            <div className={styles["marquee-row"]} ref={brandRow2Ref}>
              <div className={styles["marquee-track"]}>
                {[...Array(8)].map((_, arrayIdx) => (
                  <div
                    key={arrayIdx}
                    className={styles["marquee-content"]}
                    aria-hidden={arrayIdx > 0 ? "true" : "false"}
                  >
                    {brandRow2.map((brand) => (
                      <div key={brand} className={styles["brand-card-mini"]}>
                        <img
                          src={`/images/logos/brands/${brand}.png`}
                          alt={brand}
                          className={styles["brand-icon"]}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3 */}
            <div
              className={`${styles["marquee-row"]} ${styles.reverse}`}
              ref={brandRow3Ref}
            >
              <div className={styles["marquee-track"]}>
                {[...Array(8)].map((_, arrayIdx) => (
                  <div
                    key={arrayIdx}
                    className={styles["marquee-content"]}
                    aria-hidden={arrayIdx > 0 ? "true" : "false"}
                  >
                    {brandRow3.map((brand) => (
                      <div key={brand} className={styles["brand-card-mini"]}>
                        <img
                          src={`/images/logos/brands/${brand}.png`}
                          alt={brand}
                          className={styles["brand-icon"]}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={styles.testimonials}>
        <div className="container">
          <h2
            className={`${styles["section-title"]} ${styles["testimonials-title"]}`}
          >
            Happy Customers
          </h2>
          <div className={styles["carousel-wrapper"]}>
            <button
              className={`${styles["carousel-btn"]} ${styles.prev}`}
              onClick={() => scrollTestimonials("prev")}
              aria-label="Previous"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className={styles["carousel-track"]} ref={testimonialTrackRef}>
              {testimonials.map((t, idx) => (
                <div key={idx} className={styles["testimonial-card"]}>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className="bi bi-star-fill"></i>
                    ))}
                  </div>
                  <p className={styles["review-text"]}>{t.text}</p>
                  <p className={styles["customer-name"]}>{t.name}</p>
                </div>
              ))}
            </div>

            <button
              className={`${styles["carousel-btn"]} ${styles.next}`}
              onClick={() => scrollTestimonials("next")}
              aria-label="Next"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <Newsletter bgImage="/images/backgrounds/newsletter_background.jpeg" />

      {/* FEATURES STRIP */}
      <section className={styles["features-strip"]}>
        <div className="container">
          <div className={styles["features-grid"]}>
            <div className={styles["feature-item"]}>
              <i className="bi bi-box-seam"></i>
              <p>FREE DELIVERY PREPAID</p>
            </div>
            <div className={styles["feature-item"]}>
              <i className="bi bi-arrow-counterclockwise"></i>
              <p>SATISFIED OR REFUNDED</p>
            </div>
            <div className={styles["feature-item"]}>
              <i className="bi bi-chat-dots"></i>
              <p>BEST CHAT SUPPORT</p>
            </div>
            <div className={styles["feature-item"]}>
              <i className="bi bi-credit-card"></i>
              <p>SECURE PAYMENTS</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
