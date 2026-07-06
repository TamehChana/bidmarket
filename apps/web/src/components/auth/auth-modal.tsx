"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthIntent } from "@/context/auth-modal-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: {
    returnUrl?: string;
    intent?: AuthIntent;
    auction?: {
      id: string;
      currentBid: number;
      product: { title: string; images: string[] };
    };
  };
}

export function AuthModal({ isOpen, onClose, options }: AuthModalProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }

      onClose();
      if (options.returnUrl) {
        router.push(options.returnUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    options.intent === "bid"
      ? "Sign in to bid"
      : mode === "login"
        ? "Welcome back"
        : "Create your account";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-2xl animate-fade-up"
      >
        {options.auction ? (
          <div className="flex items-center gap-3 border-b border-border bg-brand-muted px-5 py-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-brand-muted">
              {options.auction.product.images[0] ? (
                <Image
                  src={options.auction.product.images[0]}
                  alt={options.auction.product.title}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="line-clamp-1 text-sm text-muted">
                {options.auction.product.title}
              </p>
              <p className="text-sm tabular-nums">
                Current bid: {formatCurrency(options.auction.currentBid)}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-b border-border px-5 py-4">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted">
              Register to bid, track auctions, and win products.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {mode === "register" ? (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          {error ? <p className="text-sm text-urgent">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  className="font-medium text-accent"
                  onClick={() => setMode("register")}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-accent"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="rounded-xl bg-brand-muted p-3 text-xs text-muted">
            Demo: demo@bidmarket.com · seller@bidmarket.com · admin@bidmarket.com
            — password123
          </p>
        </form>
      </div>
    </div>
  );
}
