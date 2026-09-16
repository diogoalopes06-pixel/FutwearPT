import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const FavoritesContext = createContext(null);
const STORAGE_KEY = "dq_favorites_v1";

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const favoritesSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = (id) => favoritesSet.has(id);

  const toggleFavorite = (product) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(product.id);
      if (exists) {
        toast.message("Removido dos favoritos");
        return prev.filter((id) => id !== product.id);
      }
      toast.success(`${product.name} guardado nos favoritos`);
      return [...prev, product.id];
    });
  };

  return <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
