import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import toast from "react-hot-toast";
import { authAPI, meAPI, setAuthToken } from "../lib/api";

type Role = "admin" | "mechanic";

export interface User {
  id: number | string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** Lae kasutaja / valideeri token */
  const refreshUser = async () => {
    try {
      const res = await meAPI.get();
      setUser(res);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const userData = localStorage.getItem("user_data");

      if (token) setAuthToken(token);
      if (token && userData) {
        try {
          // Lisakontroll, et token kehtib
          await authAPI.getCurrentUser();
          const parsed = JSON.parse(userData) as User;
          setUser(parsed);
        } catch (error) {
          console.error("Token validation failed:", error);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
          setAuthToken(undefined);
          setUser(null);
        }
      }
      setLoading(false);
    };
    void initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      // eeldame backendist: { token, user }
      const { token, user: userData } = response.data;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(userData));
      setAuthToken(token);
      setUser(userData);

      toast.success("Login successful!");
      return true;
    } catch (error: any) {
      const message = error?.response?.data?.error || "Login failed";
      toast.error(message);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await authAPI.register(data);
      const { token, user: userData } = response.data;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(userData));
      setAuthToken(token);
      setUser(userData);

      toast.success("Registration successful!");
      return true;
    } catch (error: any) {
      const message = error?.response?.data?.error || "Registration failed";
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setAuthToken(undefined);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
