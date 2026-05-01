import React, { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(localStorage.getItem("strideCurrency") || "USD");
  const [rate, setRate] = useState(parseFloat(localStorage.getItem("strideExchangeRate")) || 1);
  const [symbol, setSymbol] = useState(localStorage.getItem("strideCurrencySymbol") || "$");

  const updateCurrencyState = (newCurrency, newRate, newSymbol) => {
    setCurrency(newCurrency);
    setRate(newRate);
    setSymbol(newSymbol);
    
    localStorage.setItem("strideCurrency", newCurrency);
    localStorage.setItem("strideExchangeRate", newRate);
    localStorage.setItem("strideCurrencySymbol", newSymbol);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setCurrency(localStorage.getItem("strideCurrency") || "USD");
      setRate(parseFloat(localStorage.getItem("strideExchangeRate")) || 1);
      setSymbol(localStorage.getItem("strideCurrencySymbol") || "$");
    };

    window.addEventListener("currencyUpdated", handleUpdate);
    return () => window.removeEventListener("currencyUpdated", handleUpdate);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, updateCurrencyState }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
