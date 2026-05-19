import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./Reviews.module.css";

const EMOJIS = ["🔥", "👟", "😍", "💯", "⭐", "👌", "👍", "😎", "✨", "🏃‍♂️"];

const formatAuthorName = (name) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Internal component to handle the image loading state flawlessly
const ReviewAvatar = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={styles["review-avatar"]}>
        <i className="bi bi-person-fill"></i>
      </div>
    );
  }

  return (
    <div className={styles["review-avatar"]}>
      {!loaded && (
        <div className={styles["loader-overlay"]}>
          <div className={styles.loader}>
            <div className={styles.bar1}></div>
            <div className={styles.bar2}></div>
            <div className={styles.bar3}></div>
            <div className={styles.bar4}></div>
            <div className={styles.bar5}></div>
            <div className={styles.bar6}></div>
            <div className={styles.bar7}></div>
            <div className={styles.bar8}></div>
            <div className={styles.bar9}></div>
            <div className={styles.bar10}></div>
            <div className={styles.bar11}></div>
            <div className={styles.bar12}></div>
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={{
          opacity: loaded ? 1 : 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "relative",
          zIndex: 2,
          transition: "opacity 0.3s",
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

export default function Reviews({ productId, onRatingUpdate }) {
  // State
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form State
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole"));
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const emojiPickerRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const textareaRef = useRef(null);

  // 1. Fetch Reviews
  const fetchAndRenderReviews = async () => {
    if (!productId) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      if (!window.supabase) throw new Error("Database connecting...");

      const { data, error } = await window.supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Replicate the global sync for the main product rating if callback provided
      if (data && data.length > 0) {
        const total = data.reduce((sum, rev) => sum + rev.rating, 0);
        const avg = (total / data.length).toFixed(1);
        if (onRatingUpdate)
          onRatingUpdate({ avgRating: avg, totalCount: data.length });
      } else {
        if (onRatingUpdate) onRatingUpdate({ avgRating: 0, totalCount: 0 });
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setFetchError("Failed to load reviews.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRenderReviews();

    // Check auth status continuously
    const handleAuth = () => {
      setUserRole(localStorage.getItem("userRole"));
    };
    window.addEventListener("firebaseInitialized", handleAuth);
    return () => window.removeEventListener("firebaseInitialized", handleAuth);
  }, [productId]);

  // 2. Click outside logic for Emoji Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showEmojiPicker]);

  // 3. Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = window.auth ? window.auth.currentUser : null;
    if (!user) {
      if (window.showToast)
        window.showToast("Please log in to submit a review.", "error");
      return;
    }

    // Admin Testing Lab Restriction
    if (userRole === "admin") {
      const testConfig = JSON.parse(localStorage.getItem("stride_admin_test_config")) || { allowReviews: false };
      if (!testConfig.allowReviews) {
        if (window.showToast) window.showToast("Admin restricted: 'Allow Writing Reviews' is turned OFF in Testing Lab.", "warning");
        return;
      }
    }

    if (selectedRating === 0) {
      if (window.showToast)
        window.showToast("Please select a star rating", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await window.supabase.from("reviews").insert([
        {
          product_id: productId,
          user_id: user.uid,
          user_name: user.displayName || "Verified Buyer",
          user_photo_url: user.photoURL || null,
          rating: parseInt(selectedRating),
          review_text: reviewText,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      if (window.showToast)
        window.showToast("Review submitted successfully!", "success");

      // Reset form
      setSelectedRating(0);
      setHoverRating(0);
      setReviewText("");

      // Refresh list
      await fetchAndRenderReviews();
    } catch (err) {
      console.error("Error submitting review:", err);
      if (window.showToast)
        window.showToast("Failed to submit review.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiClick = (emoji) => {
    setReviewText((prev) => prev + emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const generateStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <i
        key={star}
        className={`bi ${star <= rating ? "bi-star-fill" : "bi-star"}`}
      ></i>
    ));
  };

  const visibleReviews = isExpanded ? reviews : reviews.slice(0, 2);

  return (
    <section id="reviews" className={styles["reviews-section"]}>
      <div className="container">
        <div className={styles["section-header"]}>
          <h2 className={styles["section-title"]}>Customer Reviews</h2>
        </div>

        <div className={styles["reviews-layout"]}>
          {/* Form Area */}
          <div className={styles["review-submission"]}>
            {!userRole ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <i
                  className="bi bi-lock"
                  style={{ fontSize: "2rem", color: "var(--color-accent)" }}
                ></i>
                <h4
                  style={{
                    marginTop: "1rem",
                    color: "var(--color-fg)",
                    fontWeight: 700,
                  }}
                >
                  Share your thoughts
                </h4>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-muted-fg)",
                    margin: "1rem 0",
                  }}
                >
                  Only registered members can write reviews for Stride products.
                </p>
                <Link
                  to="/login"
                  className={styles["btn-primary"]}
                  style={{ display: "block", textDecoration: "none" }}
                >
                  Login to Review
                </Link>
              </div>
            ) : (
              <form className={styles["review-form"]} onSubmit={handleSubmit}>
                <h4>Write a Review</h4>
                <div
                  className={styles["rating-input"]}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`bi ${star <= (hoverRating || selectedRating) ? "bi-star-fill" : "bi-star"}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setSelectedRating(star)}
                    ></i>
                  ))}
                </div>

                <div className={styles["text-input-container"]}>
                  <textarea
                    ref={textareaRef}
                    className={styles["review-textarea"]}
                    placeholder="Tell others what you think about the fit, quality and comfort..."
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  ></textarea>

                  <button
                    type="button"
                    ref={emojiBtnRef}
                    className={styles["emoji-toggle-btn"]}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😀
                  </button>

                  {showEmojiPicker && (
                    <div
                      className={styles["emoji-picker"]}
                      ref={emojiPickerRef}
                    >
                      {EMOJIS.map((emoji, idx) => (
                        <span
                          key={idx}
                          className={styles["emoji-opt"]}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmojiClick(emoji);
                          }}
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className={styles["btn-primary"]}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Posting..." : "Post Review"}
                </button>
              </form>
            )}
          </div>

          {/* List Area */}
          <div className={styles["reviews-content-wrapper"]}>
            <div className={styles["reviews-list"]}>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <div
                    className="spinner-border text-accent"
                    role="status"
                    style={{ color: "var(--color-accent)" }}
                  ></div>
                  <p
                    style={{
                      marginTop: "0.5rem",
                      color: "var(--color-muted-fg)",
                    }}
                  >
                    Loading reviews...
                  </p>
                </div>
              ) : fetchError ? (
                <div
                  className={styles["review-item"]}
                  style={{
                    textAlign: "center",
                    color: "#ef4444",
                    border: "none",
                    boxShadow: "none",
                  }}
                >
                  {fetchError}
                </div>
              ) : reviews.length === 0 ? (
                <div
                  className={styles["review-item"]}
                  style={{
                    textAlign: "center",
                    color: "var(--color-muted-fg)",
                    border: "none",
                    boxShadow: "none",
                  }}
                >
                  No reviews yet for this product. Be the first to review!
                </div>
              ) : (
                visibleReviews.map((r) => (
                  <div key={r.id} className={styles["review-item"]}>
                    <div className={styles["review-meta"]}>
                      <div className={styles["review-author-container"]}>
                        <ReviewAvatar
                          src={r.user_photo_url}
                          alt={r.user_name}
                        />
                        <span className={styles["review-author"]}>
                          {formatAuthorName(r.user_name)}
                        </span>
                      </div>
                      <div
                        style={{
                          color: "var(--color-accent)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {generateStars(r.rating)}
                      </div>
                    </div>
                    <p className={styles["review-text"]}>{r.review_text}</p>
                    <span className={styles["review-date"]}>
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(r.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {reviews.length > 2 && (
              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button
                  className={styles["review-toggle-btn"]}
                  aria-label="Toggle Reviews"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <i
                    className={`bi ${isExpanded ? "bi-chevron-up" : "bi-chevron-down"}`}
                  ></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
