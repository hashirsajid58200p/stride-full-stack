import React from "react";
import styles from "./RouteLoader.module.css";

export default function RouteLoader() {
  return (
    <div className={styles.routeLoaderContainer}>
      <div className={styles.spinnerWrapper}>
        <div className={styles.ring}></div>
        <div className={styles.ringInner}></div>
        <span className={styles.brandText}>STRIDE</span>
      </div>
    </div>
  );
}
