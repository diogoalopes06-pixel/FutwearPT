import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

const CartContext = createContext(null);
const STORAGE_KEY = "futwearpt_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1, options = {}) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.id && i.size === options.size && i.custom_name === options.custom_name && i.custom_number === options.custom_number);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: +(next[idx].quantity + qty).toFixed(2) };
        return next;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          image: product.image,
          quantity: qty,
          size: options.size || null,
          custom_name: options.custom_name || null,
          custom_number: options.custom_number || null,
        },
      ];
    });
    toast.success(`${product.name} adicionado ao cesto`);
  };

  const setQty = (product_id, qty) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product_id === product_id ? { ...i, quantity: +qty } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (product_id) =>
    setItems((prev) => prev.filter((i) => i.product_id !== product_id));

  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, setQty, removeItem, clear, subtotal, count, open, setOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
