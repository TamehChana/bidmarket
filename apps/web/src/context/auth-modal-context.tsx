"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Auction } from "@bidmarket/shared";
import { AuthModal } from "@/components/auth/auth-modal";

export type AuthIntent = "bid" | "watch" | "admin" | "general";

interface AuthModalOptions {
  returnUrl?: string;
  intent?: AuthIntent;
  defaultMode?: "login" | "register";
  auction?: Pick<Auction, "id" | "currentBid" | "product">;
}

interface AuthModalContextValue {
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOptions>({});

  const openAuthModal = useCallback((nextOptions: AuthModalOptions = {}) => {
    setOptions(nextOptions);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal }),
    [openAuthModal, closeAuthModal],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} options={options} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}
