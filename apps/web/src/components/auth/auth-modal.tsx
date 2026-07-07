"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { ApiError, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthIntent } from "@/context/auth-modal-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: {
    returnUrl?: string;
    intent?: AuthIntent;
    defaultMode?: "login" | "register";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resolveDefaultMode(): "login" | "register" {
    if (options.defaultMode) {
      return options.defaultMode;
    }
    if (
      options.intent === "admin" ||
      options.intent === "watch"
    ) {
      return "login";
    }
    if (options.intent === "bid") {
      return "register";
    }
    return "register";
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(resolveDefaultMode());
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");

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
  }, [isOpen, onClose, options.intent, options.defaultMode]);

  const isAdminIntent = options.intent === "admin";
  const effectiveMode = isAdminIntent ? "login" : mode;

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (effectiveMode === "register") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        await register(name, email, password);
      } else {
        await login(email, password);
      }

      onClose();
      if (options.returnUrl) {
        router.push(options.returnUrl);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(
          effectiveMode === "login"
            ? "Invalid email or password. Create an account if you are new here."
            : "Could not create your account. Try a different email.",
        );
      } else {
        setError(getErrorMessage(err, "Authentication failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = isAdminIntent
    ? "Admin sign in"
    : options.intent === "bid"
      ? "Sign in to bid"
      : effectiveMode === "login"
        ? "Welcome back"
        : "Create your account";

  const subtitle = isAdminIntent
    ? "Sign in with your admin account. New accounts are not granted admin access."
    : effectiveMode === "login"
      ? "Sign in to bid, track auctions, and manage your account."
      : "Register to bid, track auctions, and win products.";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl animate-fade-up"
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
            <p className="text-lg font-medium">{title}</p>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {effectiveMode === "register" ? (
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
              autoComplete={
                effectiveMode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {effectiveMode === "register" ? (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-urgent">{error}</p> : null}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              isSubmitting ||
              (effectiveMode === "register" &&
                (password.length < 8 || password !== confirmPassword))
            }
          >
            {isSubmitting
              ? "Please wait..."
              : effectiveMode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>

          {!isAdminIntent ? (
          <p className="text-center text-sm text-muted">
            {effectiveMode === "login" ? (
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
          ) : null}
        </form>
      </div>
    </div>
  );
}
