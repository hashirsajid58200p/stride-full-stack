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
// GLOBAL CURRENCY SYSTEM (Simplified for Instant Load)
// ==========================================

// Global Price Formatter locked to USD for max speed
window.formatPrice = function (usdPrice) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(usdPrice);
};

// Dispatch the event immediately so components render instantly without waiting for an API
window.dispatchEvent(new Event("currencyUpdated"));
