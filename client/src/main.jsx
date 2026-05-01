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

// Initialize Global Pricing Logic
initCurrencyDetection();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <OfferProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </OfferProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
