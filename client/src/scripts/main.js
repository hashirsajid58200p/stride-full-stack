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
    // SPEED FIX: Fetching 1 combined, cached API route instead of 3
    // Deployment Version
    const response = await fetch("/api/config");
    // Local Version
    // const response = await fetch("http://localhost:5000/api/config");

    if (!response.ok) throw new Error("Failed to fetch app config");
    const config = await response.json();

    // Initialize Firebase
    const app = initializeApp(config.firebase);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();

    // Attach to window so signup.js and login.js can see them
    window.auth = auth;
    window.googleProvider = googleProvider;
    window.signInWithEmailAndPassword = signInWithEmailAndPassword;
    window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
    window.signInWithPopup = signInWithPopup;
    window.onAuthStateChanged = onAuthStateChanged;

    // Initialize Supabase
    const supabase = createClient(
      config.supabase.supabaseUrl,
      config.supabase.supabaseKey,
    );
    window.supabase = supabase; // Attach globally so your dashboards can use it

    // Initialize Stripe SDK
    window.stripePublishableKey = config.stripe.publishableKey;
    const stripeScript = document.createElement("script");
    stripeScript.src = "https://js.stripe.com/v3/";
    document.head.appendChild(stripeScript);

    // Dispatch events so other scripts know the backends are ready
    window.dispatchEvent(new Event("firebaseInitialized"));
    window.dispatchEvent(new Event("supabaseInitialized"));
    window.dispatchEvent(new Event("stripeInitialized"));

    console.log("Backends dynamically initialized with unified config.");
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

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      while (wrapper.firstChild) {
        if (wrapper.firstChild.tagName !== "SCRIPT") {
          placeholder.appendChild(wrapper.firstChild);
        } else {
          const scriptNode = document.createElement("script");
          scriptNode.textContent = wrapper.firstChild.textContent;
          document.body.appendChild(scriptNode);
          wrapper.removeChild(wrapper.firstChild);
        }
      }

      if (initFunctionName && typeof window[initFunctionName] === "function") {
        window[initFunctionName]();
      }
    })
    .catch((err) => console.error(`Error loading component ${url}:`, err));
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("cart-placeholder")) {
    const cartPlaceholder = document.createElement("div");
    cartPlaceholder.id = "cart-placeholder";
    document.body.appendChild(cartPlaceholder);
  }

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

  if (document.getElementById("support-widget-placeholder")) {
    loadComponent(
      "../components/support.html",
      "support-widget-placeholder",
      "initSupportWidget",
    );
  }
});

// ==========================================
// ASYNCHRONOUS GLOBAL CURRENCY SYSTEM
// ==========================================

window.formatPrice = function (usdPrice) {
  const rate = parseFloat(localStorage.getItem("strideExchangeRate")) || 1;
  const currency = localStorage.getItem("strideCurrency") || "USD";
  const converted = usdPrice * rate;

  const noDecimals = ["PKR", "JPY", "KRW", "INR"].includes(currency);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: noDecimals ? 0 : 2,
    minimumFractionDigits: noDecimals ? 0 : 2,
  }).format(converted);
};

async function initCurrencySystem() {
  // FIRE INSTANTLY: This renders the UI immediately using cached values so the user never waits!
  window.dispatchEvent(new Event("currencyUpdated"));

  const cacheTime = localStorage.getItem("strideCurrencyTime");
  const now = new Date().getTime();

  if (cacheTime && now - parseInt(cacheTime) < 43200000) {
    console.log(
      "Using cached currency:",
      localStorage.getItem("strideCurrency"),
    );
    return;
  }

  let targetCurrency = "USD";

  try {
    try {
      const res1 = await fetch("https://ipapi.co/json/");
      const data1 = await res1.json();
      targetCurrency = data1.currency || "USD";
    } catch (err1) {
      console.warn("Primary IP API blocked by browser. Trying fallback...");
      try {
        const res2 = await fetch("https://freeipapi.com/api/json");
        const data2 = await res2.json();
        targetCurrency = data2.currency?.code || "USD";
      } catch (err2) {
        console.warn("Fallback API blocked. Using native browser timezone...");
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

    // Fetch the conversion rate in the background without freezing the UI
    const rateRes = await fetch(`/api/currency?target=${targetCurrency}`);
    const rateData = await rateRes.json();

    if (rateData.rate) {
      localStorage.setItem("strideCurrency", targetCurrency);
      localStorage.setItem("strideExchangeRate", rateData.rate);
      localStorage.setItem("strideCurrencyTime", now.toString());

      // FIRE AGAIN: Silently updates the prices on screen now that we have fresh data
      window.dispatchEvent(new Event("currencyUpdated"));
      console.log(`Currency dynamically updated to ${targetCurrency}`);
    }
  } catch (error) {
    console.error(
      "Failed to initialize currency system, defaulting to USD.",
      error,
    );
    localStorage.setItem("strideCurrency", "USD");
    localStorage.setItem("strideExchangeRate", "1");
    window.dispatchEvent(new Event("currencyUpdated"));
  }
}

// Start background currency fetch
initCurrencySystem();
