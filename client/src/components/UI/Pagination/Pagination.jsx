import React from 'react';
import styles from './Pagination.module.css';

const Pagination = ({ totalPages, current, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className={styles["pagination-container"]}>
      <button
        className={styles["page-btn"]}
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
      >
        <i className="bi bi-chevron-left"></i>
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          className={`${styles["page-btn"]} ${current === p ? styles.active : ""}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className={styles["page-btn"]}
        disabled={current === totalPages}
        onClick={() => onPageChange(current + 1)}
      >
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  );
};

export default Pagination;
