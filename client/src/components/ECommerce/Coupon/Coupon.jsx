import React, { useState, useEffect } from "react";
import styles from "./Coupon.module.css";

export default function Coupon() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'applied'
  const [appliedCode, setAppliedCode] = useState("");

  // 1. Initial Load: Check if an offer is already applied in localStorage
  useEffect(() => {
    const savedOfferStr = localStorage.getItem("strideAppliedOffer");
    if (savedOfferStr) {
      try {
        const savedOffer = JSON.parse(savedOfferStr);
        setAppliedCode(savedOffer.code);
        setStatus("applied");
      } catch (e) {
        console.error("Failed to parse saved offer from localStorage", e);
      }
    }

    // Attach global reset function to window to match vanilla behavior
    window.resetCouponComponent = handleReset;

    return () => {
      delete window.resetCouponComponent;
    };
  }, []);

  const handleReset = () => {
    localStorage.removeItem("strideAppliedOffer");
    localStorage.removeItem("strideDiscount");
    setCode("");
    setAppliedCode("");
    setStatus("idle");
  };

  const handleApply = async () => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      if (typeof window.showToast === "function") {
        window.showToast("Please enter a discount code.", "error");
      }
      return;
    }

    setStatus("loading");

    try {
      if (!window.supabase) {
        throw new Error("Database connection not established.");
      }

      // Query Supabase exactly like your vanilla code
      const { data: offer, error } = await window.supabase
        .from("offers")
        .select("*")
        .ilike("code", trimmedCode)
        .eq("status", "Active")
        .maybeSingle();

      if (error || !offer) {
        throw new Error("Invalid or expired discount code.");
      }

      // Date Validation logic
      const today = new Date();
      const validUntil = new Date(offer.valid_until);
      if (today > validUntil) {
        throw new Error("This discount code has expired.");
      }

      // Success: Save entire offer to localStorage for checkout logic
      localStorage.setItem("strideAppliedOffer", JSON.stringify(offer));

      // Dispatch global event for other components (like Cart) to listen to
      window.dispatchEvent(
        new CustomEvent("couponApplied", {
          detail: { offer, code: trimmedCode },
        }),
      );

      setAppliedCode(trimmedCode);
      setStatus("applied");
      setCode("");
    } catch (err) {
      console.error("Coupon verification failed:", err);
      if (typeof window.showToast === "function") {
        window.showToast(err.message, "error");
      } else {
        alert(err.message);
      }
      handleReset();
    }
  };

  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        placeholder={
          status === "applied"
            ? `Code ${appliedCode} Applied!`
            : "Discount code"
        }
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={status === "applied" || status === "loading"}
      />
      <button
        type="button"
        onClick={handleApply}
        disabled={status === "applied" || status === "loading"}
      >
        {status === "loading"
          ? "Verifying..."
          : status === "applied"
            ? "Applied"
            : "Apply"}
      </button>
    </div>
  );
}
