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

  const formatPrice = (amount) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return `${symbol} 0`;
    }
    const num = Number(amount);
    const converted = Math.round(num * (rate || 1));

    if (currency === "PKR") {
      return `Rs ${converted.toLocaleString()}`;
    }

    try {
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return formatter.format(converted);
    } catch (e) {
      return `${symbol}${converted.toLocaleString()}`;
    }
  };

  useEffect(() => {
    window.formatPrice = formatPrice;
  }, [currency, rate, symbol]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        rate,
        symbol,
        updateCurrencyState,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
