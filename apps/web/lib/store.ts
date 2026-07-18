"use client";

import { create } from "zustand";
import { api, type User } from "./api";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  setAuth: (token: string, user: User | null) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,
  setAuth: (token, user) => {
    localStorage.setItem("access_token", token);
    set({ token, user, loading: false });
  },
  clearAuth: () => {
    localStorage.removeItem("access_token");
    set({ token: null, user: null, loading: false });
  },
  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ token: null, user: null, loading: false });
      return;
    }

    try {
      const user = await api.getMe();
      set({ token, user, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ token: null, user: null, loading: false });
    }
  },
}));
