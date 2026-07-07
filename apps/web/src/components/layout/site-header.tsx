"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, Menu, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/browse", label: "Browse" },
  { href: "/seller", label: "Sell" },
  { href: "/me/bids", label: "My Bids", requiresAuth: true },
  { href: "/me/watchlist", label: "Watchlist", requiresAuth: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin");

  function openSignInModal() {
    if (isAdminRoute) {
      openAuthModal({
        returnUrl: "/admin",
        intent: "admin",
        defaultMode: "login",
      });
      return;
    }
    openAuthModal({ intent: "general", defaultMode: "login" });
  }

  function handleNavClick(href: string, requiresAuth?: boolean) {
    setMobileOpen(false);
    if (requiresAuth && !isAuthenticated) {
      openAuthModal({ returnUrl: href, intent: "general" });
    }
  }

  function navLinkClass(isActive: boolean) {
    return cn(
      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-accent-muted text-accent"
        : "text-muted hover:bg-brand-muted hover:text-foreground",
    );
  }

  const showAuthenticated = isAuthenticated;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm transition-transform group-hover:scale-[1.02]">
            <Gavel className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <span className="block text-[1.125rem] font-medium tracking-tight text-foreground">
              BidMarket
            </span>
            <span className="hidden text-xs text-muted sm:block">Cameroon</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (item.requiresAuth && !isAuthenticated) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      returnUrl: item.href,
                      intent: "general",
                    })
                  }
                  className={navLinkClass(false)}
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className={navLinkClass(pathname.startsWith("/admin"))}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {showAuthenticated && isAuthenticated ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate text-sm text-foreground">
                  {user?.name}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-brand-muted" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={openSignInModal}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  openAuthModal({ intent: "general", defaultMode: "register" })
                }
              >
                Get started
              </Button>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-brand-muted md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) =>
              item.requiresAuth && !isAuthenticated ? (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href, true)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    pathname === item.href
                      ? "bg-accent-muted text-accent"
                      : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
            {isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname.startsWith("/admin")
                    ? "bg-accent-muted text-accent"
                    : "text-muted",
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
