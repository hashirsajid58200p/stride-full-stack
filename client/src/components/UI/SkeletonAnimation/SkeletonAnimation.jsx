import React from "react";
import styles from "./SkeletonAnimation.module.css";

export default function SkeletonAnimation({ count = 1 }) {
  // Create an array of length `count` and map over it to render the skeletons
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={styles["product-card-skeleton"]}
        >
          <div
            className={`${styles["product-image"]} ${styles["skeleton-box"]}`}
          ></div>
          <div className={styles["product-content"]}>
            <div className={styles["product-info"]}>
              <div
                className={`${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                style={{ width: "30%", height: "12px", marginBottom: "8px" }}
              ></div>
              <div
                className={`${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                style={{ width: "70%", height: "20px", marginBottom: "8px" }}
              ></div>
              <div
                className={`${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                style={{ width: "50%", height: "15px", marginBottom: "12px" }}
              ></div>
              <div
                className={`${styles["skeleton-box"]} ${styles["skeleton-text"]}`}
                style={{ width: "40%", height: "22px" }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
