import React from "react";
import styles from "./ColorShades.module.css";

const COLOR_MAP = [
  { name: "Default", class: "color-default" },
  { name: "Red", class: "color-red" },
  { name: "Blue", class: "color-blue" },
  { name: "Yellow", class: "color-yellow" },
  { name: "Green", class: "color-green" },
  { name: "Orange", class: "color-orange" },
  { name: "Purple", class: "color-purple" },
  { name: "Pink", class: "color-pink" },
  { name: "Brown", class: "color-brown" },
  { name: "Black", class: "color-black" },
  { name: "White", class: "color-white" },
  { name: "Gray", class: "color-gray" },
  { name: "Maroon", class: "color-maroon" },
  { name: "Crimson", class: "color-crimson" },
  { name: "Scarlet", class: "color-scarlet" },
  { name: "Navy", class: "color-navy" },
  { name: "Sky Blue", class: "color-skyblue" },
  { name: "Royal Blue", class: "color-royalblue" },
  { name: "Mustard", class: "color-mustard" },
  { name: "Gold", class: "color-gold" },
  { name: "Lemon", class: "color-lemon" },
  { name: "Olive", class: "color-olive" },
  { name: "Lime", class: "color-lime" },
  { name: "Emerald", class: "color-emerald" },
  { name: "Coral", class: "color-coral" },
  { name: "Peach", class: "color-peach" },
  { name: "Tangerine", class: "color-tangerine" },
  { name: "Violet", class: "color-violet" },
  { name: "Lavender", class: "color-lavender" },
  { name: "Magenta", class: "color-magenta" },
  { name: "Hot Pink", class: "color-hotpink" },
  { name: "Rose", class: "color-rose" },
  { name: "Fuchsia", class: "color-fuchsia" },
  { name: "Chocolate", class: "color-chocolate" },
  { name: "Tan", class: "color-tan" },
  { name: "Beige", class: "color-beige" },
  { name: "Charcoal", class: "color-charcoal" },
  { name: "Jet Black", class: "color-jetblack" },
  { name: "Ivory", class: "color-ivory" },
  { name: "Off-White", class: "color-offwhite" },
  { name: "Silver", class: "color-silver" },
  { name: "Slate", class: "color-slate" },
];

export default function ColorShades({ selectedColors = [], onChange }) {
  const handleToggle = (colorName) => {
    if (!onChange) return;
    const newSelection = selectedColors.includes(colorName)
      ? selectedColors.filter((c) => c !== colorName)
      : [...selectedColors, colorName];
    onChange(newSelection);
  };

  return (
    <div className={styles["color-swatch-list"]}>
      {COLOR_MAP.map((color) => (
        <label key={color.name} className={styles["color-swatch-item"]}>
          <input
            type="checkbox"
            name="color"
            value={color.name}
            className={styles["color-input"]}
            checked={selectedColors.includes(color.name)}
            onChange={() => handleToggle(color.name)}
          />
          <span
            className={`${styles.swatch} ${styles[color.class]}`}
            title={color.name}
          >
            {color.name === "Default" ? (
              <span className={styles["def-text"]}>DEF</span>
            ) : (
              <i className="bi bi-check"></i>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
