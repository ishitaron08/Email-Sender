"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import apiClient from "@/lib/apiClient";
import { User } from "@/types";

interface SessionContextValue {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const SessionCtx = createContext<SessionContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, validate it by calling /auth/me
  useEffect(() => {
    const token = localStorage.getItem("dispatch_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("dispatch_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(() => {
    // Redirect to the backend's Google OAuth entry point
    window.location.href = "/auth/google";
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("dispatch_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <SessionCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession() {
  return useContext(SessionCtx);
}
