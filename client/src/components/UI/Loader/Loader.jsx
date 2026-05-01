import React, { useState, useEffect } from "react";
import styles from "./Loader.module.css";

export default function Loader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    const minimumLoadTime = 1000; // 1 second
    const startTime = Date.now();

    const hideLoader = () => {
      const timeElapsed = Date.now() - startTime;
      const timeRemaining = Math.max(0, minimumLoadTime - timeElapsed);

      // 1. Wait for the minimum load time
      setTimeout(() => {
        setIsVisible(false); // Trigger the fade-out CSS transition

        // 2. Wait for the 0.6s transition to finish before removing from DOM
        setTimeout(() => {
          setIsRendered(false);
          document.body.style.overflow = ""; // Ensure scroll is restored
        }, 600);
      }, timeRemaining);
    };

    // React specific: App is mounted, so we can start the hide sequence
    // Check if document is already ready
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      hideLoader();
    } else {
      window.addEventListener("DOMContentLoaded", hideLoader);
    }

    // Ultimate Safety Net: Never trap user for more than 2.5s
    const safetyNet = setTimeout(hideLoader, 2500);

    return () => {
      clearTimeout(safetyNet);
      window.removeEventListener("DOMContentLoaded", hideLoader);
    };
  }, []);

  // If the logic has finished and removed the loader, render nothing
  if (!isRendered) return null;

  return (
    <div
      className={`${styles["loader-overlay"]} ${!isVisible ? styles.hidden : ""}`}
      id="stride-global-loader"
    >
      <video
        className={styles["loader-video"]}
        autoPlay
        loop
        muted
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src="/videos/loader.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
