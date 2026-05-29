/**
 * currencyHelper.js
 * Handles IP-based currency detection and global price formatting.
 */

import { getApiUrl } from "./apiConfig";

// Cache values in memory to avoid hitting localStorage in every render
let cachedCurrency = localStorage.getItem("strideCurrency") || "USD";
let cachedRate = parseFloat(localStorage.getItem("strideExchangeRate")) || 1;
let cachedSymbol = localStorage.getItem("strideCurrencySymbol") || "$";
let cachedFormatter = null;

// 1. Global Format Function (Optimized)
window.formatPrice = (amount) => {
  const converted = Math.round(amount * cachedRate);
  
  if (cachedCurrency === "PKR") {
    return `Rs ${converted.toLocaleString()}`;
  }
  
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cachedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(converted);
  } catch (e) {
    return `${cachedSymbol}${converted}`;
  }
};

// 2. Detection Logic (Mirroring working Vanilla version)
let isDetecting = false;
export const initCurrencyDetection = async () => {
  if (isDetecting) return;
  
  // Don't redetect if we have a fresh rate (less than 1 hour old)
  const lastTime = localStorage.getItem("strideCurrencyTime");
  if (lastTime && (new Date().getTime() - parseInt(lastTime)) < 3600000) {
    return; 
  }

  isDetecting = true;
  const detectCurrency = async () => {
    try {
      // Query the server-side detection immediately to avoid browser CORS issues
      const res = await fetch(getApiUrl("/api/currency/detect-ip"));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.currency) {
          return data.currency;
        }
      }
      
      // Fallback: Timezone-based detection if server is down or returns error
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Karachi")) return "PKR";
      if (tz.includes("London")) return "GBP";
      if (tz.includes("Berlin") || tz.includes("Paris")) return "EUR";
      
      return "USD";
    } catch (e) {
      // Fallback: Timezone-based detection
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Karachi")) return "PKR";
      if (tz.includes("London")) return "GBP";
      if (tz.includes("Berlin") || tz.includes("Paris")) return "EUR";
      return "USD";
    }
  };

  try {
    const detectedCurrency = await detectCurrency();
    const detectedSymbol = getSymbolFromCurrency(detectedCurrency);
    
    // Fetch latest rate for the detected currency
    const rateRes = await fetch(getApiUrl(`/api/currency?target=${detectedCurrency}`));
    const rateData = await rateRes.json();
    
    if (rateData.rate) {
      cachedCurrency = detectedCurrency;
      cachedRate = rateData.rate;
      cachedSymbol = detectedSymbol;
      cachedFormatter = null;

      localStorage.setItem("strideCurrency", detectedCurrency);
      localStorage.setItem("strideExchangeRate", rateData.rate);
      localStorage.setItem("strideCurrencyTime", new Date().getTime().toString());
      localStorage.setItem("strideCurrencySymbol", detectedSymbol);
      
      window.dispatchEvent(new Event("currencyUpdated"));
    }
  } catch (err) {
  } finally {
    isDetecting = false;
  }
};

export const changeCurrencyManual = async (newCurrency) => {
  const detectedSymbol = getSymbolFromCurrency(newCurrency);
  
  try {
    const rateRes = await fetch(getApiUrl(`/api/currency?target=${newCurrency}`));
    const rateData = await rateRes.json();
    
    if (rateData.rate) {
      cachedCurrency = newCurrency;
      cachedRate = rateData.rate;
      cachedSymbol = detectedSymbol;
      cachedFormatter = null;

      localStorage.setItem("strideCurrency", newCurrency);
      localStorage.setItem("strideExchangeRate", rateData.rate);
      localStorage.setItem("strideCurrencySymbol", detectedSymbol);
      
      window.dispatchEvent(new Event("currencyUpdated"));
    }
  } catch (err) {}
};

const getSymbolFromCurrency = (currency) => {
  const symbols = {
    'USD': '$',
    'PKR': 'Rs',
    'GBP': '£',
    'EUR': '€',
    'INR': '₹',
    'AED': 'DH',
    'CAD': 'C$',
    'AUD': 'A$'
  };
  return symbols[currency] || currency;
};
