import React, { createContext, useContext, useState, useEffect } from "react";

const OfferContext = createContext();

export function OfferProvider({ children }) {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFlashSales = async () => {
    if (!window.supabase) return;
    try {
      const { data, error } = await window.supabase
        .from("offers")
        .select("*")
        .eq("type", "flash_sale")
        .eq("status", "Active");
      
      if (error) throw error;
      setFlashSales(data || []);
    } catch (err) {
      console.error("Error fetching flash sales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.supabase) {
      fetchFlashSales();
    } else {
      const handleSupabase = () => fetchFlashSales();
      window.addEventListener("supabaseInitialized", handleSupabase);
      return () => window.removeEventListener("supabaseInitialized", handleSupabase);
    }
  }, []);

  const getDiscountedPrice = (product) => {
    if (!product || flashSales.length === 0) return product?.price || 0;

    // 1. Check for specific product flash sale
    const specificSale = flashSales.find(s => s.target_product_id === product.id);
    if (specificSale) {
      return product.price * (1 - (specificSale.discount_percentage / 100));
    }

    // 2. Check for general flash sale (target_product_id is null)
    const generalSale = flashSales.find(s => s.target_product_id === null);
    if (generalSale) {
      return product.price * (1 - (generalSale.discount_percentage / 100));
    }

    return product.price;
  };

  const getProductFlashSale = (product) => {
    if (!product || flashSales.length === 0) return null;
    return flashSales.find(s => s.target_product_id === product.id) || 
           flashSales.find(s => s.target_product_id === null) || 
           null;
  };

  return (
    <OfferContext.Provider value={{ flashSales, getDiscountedPrice, getProductFlashSale, refreshFlashSales: fetchFlashSales, loading }}>
      {children}
    </OfferContext.Provider>
  );
}

export const useOffers = () => useContext(OfferContext);
