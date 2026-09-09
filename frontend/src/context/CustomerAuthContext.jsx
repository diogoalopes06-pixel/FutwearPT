import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const CustomerAuthContext = createContext(null);
const TOKEN_KEY = "dq_customer_token";

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/customers/me")
      .then((r) => setCustomer(r.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/customers/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setCustomer(data.user);
    return data.user;
  };

  const register = async ({ name, email, password, phone, address }) => {
    const { data } = await api.post("/customers/register", { name, email, password, phone, address });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setCustomer(data.user);
    return data.user;
  };

  const updateCustomer = async (payload) => {
    const { data } = await api.patch("/customers/me", payload);
    setCustomer(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, login, register, logout, updateCustomer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
