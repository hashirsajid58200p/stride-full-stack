import React, { useState, useEffect, useCallback } from "react";
import styles from "./Notification.module.css";

export default function Notification() {
  const [toasts, setToasts] = useState([]);

  // Function to remove a toast with animation
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) =>
      prevToasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );

    // Wait for the CSS transition (0.4s) before fully removing from state
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, 400);
  }, []);

  // Bridge for vanilla JS: Attach showToast to the window object
  useEffect(() => {
    window.showToast = (message, type = "success") => {
      const id = Date.now();

      // Determine Icon based on type
      let iconClass = "bi-check-circle-fill";
      let typeStyle = styles.success;
      let iconStyle = styles.iconSuccess;

      if (type === "error") {
        iconClass = "bi-exclamation-circle-fill";
        typeStyle = styles.error;
        iconStyle = styles.iconError;
      } else if (type === "info") {
        iconClass = "bi-info-circle-fill";
        typeStyle = styles.info;
        iconStyle = styles.iconInfo;
      } else if (type === "warning") {
        iconClass = "bi-exclamation-triangle-fill";
        typeStyle = styles.warning;
        iconStyle = styles.iconWarning;
      } else if (type === "default") {
        iconClass = "bi-bell-fill";
        typeStyle = "";
        iconStyle = styles.iconDefault;
      }

      const newToast = {
        id,
        message,
        iconClass,
        typeStyle,
        iconStyle,
        exiting: false,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 3.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    };

    return () => {
      delete window.showToast;
    };
  }, [removeToast]);

  return (
    <div className={styles.container} id="global-toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.typeStyle} ${!toast.exiting ? styles.show : styles.hide}`}
        >
          <i
            className={`bi ${toast.iconClass} ${styles.icon} ${toast.iconStyle}`}
          ></i>
          <div className={styles.content}>
            <span className={styles.message}>{toast.message}</span>
          </div>
          <button
            className={styles.close}
            aria-label="Close"
            onClick={() => removeToast(toast.id)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
