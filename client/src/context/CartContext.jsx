import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(
    JSON.parse(localStorage.getItem("strideCart")) || [],
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [discount, setDiscount] = useState(
    parseFloat(localStorage.getItem("strideDiscount")) || 0,
  );
  const [flashSales, setFlashSales] = useState([]);

  // Fetch active flash sales to sync cart prices
  const fetchFlashSales = async () => {
    if (!window.supabase) return;
    try {
      const { data } = await window.supabase
        .from("offers")
        .select("*")
        .eq("type", "flash_sale")
        .eq("status", "Active");
      setFlashSales(data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchFlashSales();
    // Listen for global refresh
    window.addEventListener("refreshFlashSales", fetchFlashSales);
    return () => window.removeEventListener("refreshFlashSales", fetchFlashSales);
  }, []);

  // 1. Sync cart to LocalStorage (DEDICATED)
  useEffect(() => {
    localStorage.setItem("strideCart", JSON.stringify(cartItems));
  }, [cartItems]);

  // 2. Apply Flash Sales (CONTROLLED)
  useEffect(() => {
    if (flashSales.length === 0) return;

    setCartItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        const sale = flashSales.find(s => s.target_product_id === item.id) || 
                     flashSales.find(s => s.target_product_id === null);
        
        const targetPrice = sale 
          ? (item.basePrice ? item.basePrice * (1 - (sale.discount_percentage / 100)) : item.price)
          : (item.basePrice || item.price);

        if (Math.abs(item.price - targetPrice) > 0.01) {
          changed = true;
          return { ...item, price: targetPrice };
        }
        return item;
      });

      return changed ? updated : prev;
    });
  }, [flashSales]); // ONLY re-run when flashSales change

  // Sync with LocalStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("strideCart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.size === product.size && item.color === product.color,
      );

      // Determine starting price (handle flash sale if passed, or use product.price)
      const basePrice = product.basePrice || product.price;
      const initialPrice = product.price;

      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.size === product.size && item.color === product.color
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, basePrice, quantity: 1 }];
    });
    if (window.showToast) window.showToast(`${product.name} added to cart!`);
  };

  const updateQuantity = (index, delta) => {
    setCartItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    localStorage.removeItem("strideDiscount");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        isCartOpen,
        setIsCartOpen,
        discount,
        setDiscount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
