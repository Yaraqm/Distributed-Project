import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

type User = {
  id: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // LOGIN
  async function login(email: string, password: string): Promise<boolean> {
    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);

      const profile = await api.get("/auth/me");
      localStorage.setItem("role", profile.data.role);

      setUser(profile.data);

      return true;
    } catch {
      return false;
    }
  }

  // REGISTER
  async function register(
    email: string,
    password: string,
    role: string
  ): Promise<boolean> {
    try {
      await api.post("/auth/register", { email, password, role });
      return true;
    } catch {
      return false;
    }
  }

  // LOGOUT
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext)!;
}
