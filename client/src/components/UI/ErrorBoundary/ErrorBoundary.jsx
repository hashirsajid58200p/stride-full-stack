import React from "react";
import styles from "./ErrorBoundary.module.css";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);

    // Auto-recover from dynamic import / chunk load errors (happens after fresh deployments)
    const isChunkLoadFailed =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.message?.includes("error loading dynamically imported module");

    if (isChunkLoadFailed) {
      const hasReloaded = sessionStorage.getItem("stride_chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("stride_chunk_reload", "true");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("stride_chunk_reload");
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h2>Something went wrong</h2>
            <p>
              We encountered a temporary issue while loading this page. Please try refreshing or return to the home page.
            </p>
            <div className={styles.actions}>
              <button onClick={this.handleReload} className={styles.btnPrimary}>
                <i className="bi bi-arrow-clockwise"></i> Reload Page
              </button>
              <button onClick={this.handleGoHome} className={styles.btnSecondary}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
