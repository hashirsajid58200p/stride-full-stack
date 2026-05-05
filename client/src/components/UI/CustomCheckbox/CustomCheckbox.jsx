import React from 'react';
import styles from './CustomCheckbox.module.css';

const CustomCheckbox = ({ label, checked, onChange, id, className = "" }) => {
  return (
    <label className={`${styles.container} ${className}`} htmlFor={id}>
      <div className={styles.checkboxWrapper}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className={styles.hiddenInput}
        />
        <div className={`${styles.customCheck} ${checked ? styles.checked : ''}`}>
          {checked && <i className="bi bi-check"></i>}
        </div>
      </div>
      {label && <span className={styles.labelText}>{label}</span>}
    </label>
  );
};

export default CustomCheckbox;
