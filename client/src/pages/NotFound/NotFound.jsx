import React from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO/SEO";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <SEO
        title="Page Not Found (404)"
        description="The page you are looking for does not exist or has been moved."
        noindex={true}
      />
      <div className={styles.container}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>Out of Bounds</h1>
        <p className={styles.description}>
          The page or pair of kicks you're looking for seems to have stepped off the radar.
        </p>
        <div className={styles.actions}>
          <Link to="/" className={styles.primaryBtn}>
            Back to Home
          </Link>
          <Link to="/products" className={styles.secondaryBtn}>
            Browse Shoes
          </Link>
        </div>
      </div>
    </div>
  );
}
