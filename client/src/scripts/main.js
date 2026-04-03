// client/src/scripts/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Import Supabase directly via CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// --- FETCH CONFIG & INITIALIZE BACKENDS DYNAMICALLY ---
async function initApp() {
  try {
    // 1. Fetch ALL configs simultaneously for maximum speed
    const [firebaseRes, supabaseRes, stripeRes] = await Promise.all([
      // Deployment Version
      fetch("/api/config/firebase"),
      fetch("/api/config/supabase"),
      fetch("/api/config/stripe"),
      // Local Version
      // fetch("http://localhost:5000/api/config/firebase"),
      // fetch("http://localhost:5000/api/config/supabase"),
      // fetch("http://localhost:5000/api/config/stripe"),
    ]);

    if (!firebaseRes.ok) throw new Error("Failed to fetch Firebase config");
    if (!supabaseRes.ok) throw new Error("Failed to fetch Supabase config");
    if (!stripeRes.ok) throw new Error("Failed to fetch Stripe config");

    const firebaseConfig = await firebaseRes.json();
    const supabaseConfig = await supabaseRes.json();
    const stripeConfig = await stripeRes.json();

    // 2. Initialize Firebase with the fetched config
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();

    // 3. Attach to window so signup.js and login.js can see them
    window.auth = auth;
    window.googleProvider = googleProvider;
    window.signInWithEmailAndPassword = signInWithEmailAndPassword;
    window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
    window.signInWithPopup = signInWithPopup;
    window.onAuthStateChanged = onAuthStateChanged;

    // 4. Initialize Supabase
    const supabase = createClient(
      supabaseConfig.supabaseUrl,
      supabaseConfig.supabaseKey,
    );
    window.supabase = supabase; // Attach globally so your dashboards can use it

    // 5. Initialize Stripe SDK
    window.stripePublishableKey = stripeConfig.publishableKey;
    const stripeScript = document.createElement("script");
    stripeScript.src = "https://js.stripe.com/v3/";
    document.head.appendChild(stripeScript);

    // 6. Dispatch events so other scripts know the backends are ready
    window.dispatchEvent(new Event("firebaseInitialized"));
    window.dispatchEvent(new Event("supabaseInitialized"));
    window.dispatchEvent(new Event("stripeInitialized"));

    console.log("Firebase, Supabase, and Stripe dynamically initialized.");
  } catch (error) {
    console.error("Error initializing backends:", error);
  }
}

// Kick off the initialization process
initApp();

// --- THEME LOGIC ---
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

// --- NEW COMPONENT LOADER LOGIC (Single File Components) ---
function loadComponent(url, placeholderId, initFunctionName) {
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then((html) => {
      const placeholder = document.getElementById(placeholderId);
      if (!placeholder) return;

      // Because the HTML contains <script> tags, simply assigning innerHTML won't execute them.
      // We must extract and re-append them to force the browser to evaluate the JavaScript.
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      // Move all non-script elements into the placeholder
      while (wrapper.firstChild) {
        if (wrapper.firstChild.tagName !== "SCRIPT") {
          placeholder.appendChild(wrapper.firstChild);
        } else {
          // Re-create the script tag to force execution
          const scriptNode = document.createElement("script");
          scriptNode.textContent = wrapper.firstChild.textContent;
          document.body.appendChild(scriptNode);
          wrapper.removeChild(wrapper.firstChild);
        }
      }

      // Execute the specific initialization function for this component
      if (initFunctionName && typeof window[initFunctionName] === "function") {
        window[initFunctionName]();
      }
    })
    .catch((err) => console.error(`Error loading component ${url}:`, err));
}

document.addEventListener("DOMContentLoaded", () => {
  // Ensure the cart placeholder exists so we don't break pages that forgot it
  if (!document.getElementById("cart-placeholder")) {
    const cartPlaceholder = document.createElement("div");
    cartPlaceholder.id = "cart-placeholder";
    document.body.appendChild(cartPlaceholder);
  }

  // Load the newly flattened single-file components
  if (document.getElementById("header-placeholder")) {
    loadComponent(
      "../components/header.html",
      "header-placeholder",
      "initHeader",
    );
  }

  if (document.getElementById("cart-placeholder")) {
    loadComponent("../components/cart.html", "cart-placeholder", "initCart");
  }

  if (document.getElementById("footer-placeholder")) {
    loadComponent(
      "../components/footer.html",
      "footer-placeholder",
      "initFooter",
    );
  }

  // ==========================================
  // SUPPORT WIDGET INTEGRATION
  // ==========================================
  if (document.getElementById("support-widget-placeholder")) {
    loadComponent(
      "../components/support.html",
      "support-widget-placeholder",
      "initSupportWidget",
    );
  }
});

// ==========================================
// GLOBAL CURRENCY SYSTEM
// ==========================================

// 1. Global Price Formatter (Use this anywhere you display a price!)
window.formatPrice = function (usdPrice) {
  const rate = parseFloat(localStorage.getItem("strideExchangeRate")) || 1;
  const currency = localStorage.getItem("strideCurrency") || "USD";
  const converted = usdPrice * rate;

  // Currencies like PKR usually don't show decimals
  const noDecimals = ["PKR", "JPY", "KRW", "INR"].includes(currency);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: noDecimals ? 0 : 2,
    minimumFractionDigits: noDecimals ? 0 : 2,
  }).format(converted);
};

// 2. Initialize Currency based on IP (Adblocker-Proof)
async function initCurrencySystem() {
  const cacheTime = localStorage.getItem("strideCurrencyTime");
  const now = new Date().getTime();

  // Cache the exchange rate for 12 hours (43,200,000 ms) to save API calls
  if (cacheTime && now - parseInt(cacheTime) < 43200000) {
    console.log(
      "Using cached currency:",
      localStorage.getItem("strideCurrency"),
    );
    window.dispatchEvent(new Event("currencyUpdated"));
    return;
  }

  let targetCurrency = "USD"; // Default

  try {
    // Step A: Robust Currency Detection with Fallbacks
    try {
      // Attempt 1: Primary API
      const res1 = await fetch("https://ipapi.co/json/");
      const data1 = await res1.json();
      targetCurrency = data1.currency || "USD";
    } catch (err1) {
      console.warn("Primary IP API blocked by browser. Trying fallback...");
      try {
        // Attempt 2: Fallback API
        const res2 = await fetch("https://freeipapi.com/api/json");
        const data2 = await res2.json();
        targetCurrency = data2.currency?.code || "USD";
      } catch (err2) {
        console.warn(
          "Fallback API also blocked. Using native browser timezone detection...",
        );
        // Attempt 3: Ad-blocker proof native timezone check
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (tz.includes("Karachi")) targetCurrency = "PKR";
        else if (tz.includes("Kolkata") || tz.includes("Calcutta"))
          targetCurrency = "INR";
        else if (tz.includes("London")) targetCurrency = "GBP";
        else if (tz.includes("Europe")) targetCurrency = "EUR";
        else if (tz.includes("Dubai")) targetCurrency = "AED";
        else if (tz.includes("Riyadh")) targetCurrency = "SAR";
      }
    }

    console.log("Detected Currency:", targetCurrency);

    // Step B: Ask our Node.js backend for the conversion rate
    const rateRes = await fetch(
      // Deployment Version
      `/api/currency?target=${targetCurrency}`,
      // Local Version
      // `http://localhost:5000/api/currency?target=${targetCurrency}`,
    );
    const rateData = await rateRes.json();

    if (rateData.rate) {
      localStorage.setItem("strideCurrency", targetCurrency);
      localStorage.setItem("strideExchangeRate", rateData.rate);
      localStorage.setItem("strideCurrencyTime", now.toString());

      // Tell the rest of the app to re-render prices
      window.dispatchEvent(new Event("currencyUpdated"));
      console.log(`Currency set to ${targetCurrency} at rate ${rateData.rate}`);
    }
  } catch (error) {
    console.error(
      "Failed to initialize currency system, defaulting to USD.",
      error,
    );
    localStorage.setItem("strideCurrency", "USD");
    localStorage.setItem("strideExchangeRate", "1");
  }
}

// Start the currency system when the app loads
initCurrencySystem();
