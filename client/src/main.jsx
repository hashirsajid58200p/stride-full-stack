import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import this here
import { CartProvider } from "./context/CartContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { OfferProvider } from "./context/OfferContext";
import App from "./App.jsx";
import "./index.css";
import "./firebaseConfig"; // This ensures Firebase/Supabase are ready
import { initCurrencyDetection } from "./utils/currencyHelper";

import { HelmetProvider } from "react-helmet-async";

// Initialize Global Pricing Logic
initCurrencyDetection();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <CurrencyProvider>
          <OfferProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </OfferProvider>
        </CurrencyProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
