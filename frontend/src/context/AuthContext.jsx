import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dq_token") || sessionStorage.getItem("dq_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem("dq_token");
        sessionStorage.removeItem("dq_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, remember = true) => {
    const { data } = await api.post("/auth/login", { email, password });

    if (remember) {
      localStorage.setItem("dq_token", data.access_token);
      sessionStorage.removeItem("dq_token");
    } else {
      sessionStorage.setItem("dq_token", data.access_token);
      localStorage.removeItem("dq_token");
    }

    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("dq_token");
    sessionStorage.removeItem("dq_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
