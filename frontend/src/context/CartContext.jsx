import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

const CartContext = createContext(null);
const STORAGE_KEY = "futwearpt_cart_v1";

const itemKey = (item) =>
  [item.product_id, item.size || "", item.custom_name || "", item.custom_number || ""].join("::");

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = (product, qty = 1, options = {}) => {
    setItems((prev) => {
      const candidate = { product_id: product.id, ...options };
      const idx = prev.findIndex((i) => itemKey(i) === itemKey(candidate));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: +(next[idx].quantity + qty).toFixed(2) };
        return next;
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        unit: product.unit || "un",
        image: product.image,
        quantity: qty,
        size: options.size || null,
        custom_name: options.custom_name || null,
        custom_number: options.custom_number || null,
      }];
    });
    toast.success(product.name + " adicionado ao cesto");
  };

  const setQty = (productIdOrKey, qty) => {
    setItems((prev) => prev.map((i) => {
      const matches = itemKey(i) === productIdOrKey || i.product_id === productIdOrKey;
      return matches ? { ...i, quantity: +qty } : i;
    }).filter((i) => i.quantity > 0));
  };

  const removeItem = (productIdOrKey) =>
    setItems((prev) => prev.filter((i) => itemKey(i) !== productIdOrKey && i.product_id !== productIdOrKey));

  const clear = () => setItems([]);
  const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const count = items.reduce((s, i) => s + Number(i.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ items, addItem, setQty, removeItem, clear, subtotal, count, open, setOpen, itemKey }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
