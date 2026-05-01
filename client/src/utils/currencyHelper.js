/**
 * currencyHelper.js
 * Handles IP-based currency detection and global price formatting.
 */

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
    let targetCurrency = "USD";

    try {
      // Step A: Primary
      try {
        const res1 = await fetch("https://ipapi.co/json/");
        if (!res1.ok) throw new Error();
        const data1 = await res1.json();
        if (data1.currency) targetCurrency = data1.currency;
      } catch (err1) {
        // Step B: Secondary
        try {
          const res2 = await fetch("https://freeipapi.com/api/json");
          if (!res2.ok) throw new Error();
          const data2 = await res2.json();
          targetCurrency = data2.currency?.code || data2.currencyCode || "USD";
        } catch (err2) {
          // Step C: Timezone fallback
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
          if (tz.includes("Karachi")) targetCurrency = "PKR";
          else if (tz.includes("London")) targetCurrency = "GBP";
          else if (tz.includes("Berlin") || tz.includes("Paris")) targetCurrency = "EUR";
        }
      }

      // Final fallback: Use server-side detection if front-end failed or is USD
      if (targetCurrency === "USD" || targetCurrency === "PKR") {
        try {
          const res3 = await fetch("http://localhost:5000/api/currency/detect-ip");
          const data3 = await res3.json();
          if (data3.success && data3.currency) targetCurrency = data3.currency;
        } catch (err3) {}
      }

      return targetCurrency;
    } catch (e) {
      return "USD";
    }
  };

  try {
    const detectedCurrency = await detectCurrency();
    const detectedSymbol = getSymbolFromCurrency(detectedCurrency);
    
    // Fetch latest rate for the detected currency
    const rateRes = await fetch(`http://localhost:5000/api/currency?target=${detectedCurrency}`);
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
    const rateRes = await fetch(`http://localhost:5000/api/currency?target=${newCurrency}`);
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
