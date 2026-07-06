"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Gavel,
  Shield,
  ShoppingBag,
  Users,
} from "lucide-react";
import type {
  AdminPaymentOrder,
  AdminStats,
  AdminUser,
  Auction,
} from "@bidmarket/shared";
import { formatCurrency } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = "auctions" | "users" | "payments";

export function AdminDashboard() {
  const { isAuthenticated, isAdmin, isLoading, token, user, logout, login } =
    useAuth();
  const { openAuthModal } = useAuthModal();
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("auctions");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPaymentOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoadingData(true);
    setActionError(null);
    try {
      const [nextStats, nextAuctions, nextUsers, nextPayments] =
        await Promise.all([
          api.getAdminStats(token),
          api.getAdminAuctions(token),
          api.getAdminUsers(token),
          api.getAdminPayments(token),
        ]);
      setStats(nextStats);
      setAuctions(nextAuctions);
      setUsers(nextUsers);
      setPayments(nextPayments);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to load admin data",
      );
    } finally {
      setLoadingData(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin && token) {
      loadData();
    } else {
      setLoadingData(false);
    }
  }, [isLoading, isAuthenticated, isAdmin, token, loadData]);

  async function handleEndAuction(auctionId: string) {
    if (!token) return;
    setActionLoading(auctionId);
    setActionError(null);
    try {
      const updated = await api.adminEndAuction(auctionId, token);
      setAuctions((prev) =>
        prev.map((a) => (a.id === auctionId ? updated : a)),
      );
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveAuction(auctionId: string) {
    if (!token) return;
    if (!confirm("Remove this listing permanently?")) return;
    setActionLoading(auctionId);
    setActionError(null);
    try {
      await api.adminRemoveAuction(auctionId, token);
      setAuctions((prev) => prev.filter((a) => a.id !== auctionId));
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleSeller(userId: string, isSeller: boolean) {
    if (!token) return;
    setActionLoading(userId);
    setActionError(null);
    try {
      const updated = await api.adminUpdateUserSeller(userId, isSeller, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u)),
      );
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSignInAsAdmin() {
    setSwitchingAccount(true);
    setActionError(null);
    try {
      logout();
      await login("admin@bidmarket.com", "password123");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to sign in as admin",
      );
    } finally {
      setSwitchingAccount(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-muted" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <Shield className="mx-auto h-12 w-12 text-accent" />
        <h1 className="mt-4 text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-3 text-muted">
          Sign in with an admin account to manage users, auctions, and payments.
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() =>
            openAuthModal({ returnUrl: "/admin", intent: "general" })
          }
        >
          Sign in to continue
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <Shield className="mx-auto h-12 w-12 text-urgent" />
        <h1 className="mt-4 text-3xl font-bold">Access denied</h1>
        <p className="mt-3 text-muted">
          You&apos;re signed in as{" "}
          <span className="font-semibold text-foreground">{user?.email}</span>,
          which does not have admin privileges.
        </p>
        <p className="mt-2 text-sm text-muted">
          Use the button below to switch to the demo admin account.
        </p>
        {actionError ? (
          <p className="mt-4 text-sm text-urgent">{actionError}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={handleSignInAsAdmin} disabled={switchingAccount}>
            {switchingAccount ? "Signing in..." : "Sign in as admin"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              openAuthModal({ returnUrl: "/admin", intent: "general" });
            }}
          >
            Use another account
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Platform control</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-muted">
            Moderate listings, manage users, and monitor payments.
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} disabled={loadingData}>
          Refresh
        </Button>
      </div>

      {actionError ? (
        <p className="mt-6 rounded-xl bg-urgent-muted px-4 py-3 text-sm text-urgent">
          {actionError}
        </p>
      ) : null}

      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Users"
            value={String(stats.totalUsers)}
            detail={`${stats.totalSellers} sellers`}
          />
          <StatCard
            icon={<Gavel className="h-5 w-5" />}
            label="Live auctions"
            value={String(stats.liveAuctions)}
            detail={`${stats.endedAuctions} ended`}
          />
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Total bids"
            value={String(stats.totalBids)}
            detail={`${stats.pendingPayments} pending payments`}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Revenue"
            value={formatCurrency(stats.totalRevenue)}
            detail={`${stats.successfulPayments} paid orders`}
          />
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border pb-px">
        {(
          [
            ["auctions", "Auctions"],
            ["users", "Users"],
            ["payments", "Payments"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab
                ? "border border-b-0 border-border bg-card text-accent"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-b-2xl rounded-tr-2xl border border-border bg-card card-elevated">
        {loadingData ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-brand-muted" />
            ))}
          </div>
        ) : activeTab === "auctions" ? (
          <AuctionsTable
            auctions={auctions}
            actionLoading={actionLoading}
            onEnd={handleEndAuction}
            onRemove={handleRemoveAuction}
          />
        ) : activeTab === "users" ? (
          <UsersTable
            users={users}
            actionLoading={actionLoading}
            onToggleSeller={handleToggleSeller}
          />
        ) : (
          <PaymentsTable payments={payments} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-elevated">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function AuctionsTable({
  auctions,
  actionLoading,
  onEnd,
  onRemove,
}: {
  auctions: Auction[];
  actionLoading: string | null;
  onEnd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (auctions.length === 0) {
    return <EmptyState message="No auctions on the platform." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-brand-muted/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-5 py-3">Listing</th>
            <th className="px-5 py-3">Seller</th>
            <th className="px-5 py-3">Current bid</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {auctions.map((auction) => (
            <tr key={auction.id} className="hover:bg-brand-muted/30">
              <td className="px-5 py-4">
                <Link
                  href={`/auctions/${auction.id}`}
                  className="font-semibold text-foreground hover:text-accent"
                >
                  {auction.product.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {auction.product.category} · {auction.bidCount} bids
                </p>
              </td>
              <td className="px-5 py-4 text-muted">{auction.product.sellerName}</td>
              <td className="px-5 py-4 font-semibold tabular-nums">
                {formatCurrency(auction.currentBid)}
              </td>
              <td className="px-5 py-4">
                <Badge variant={auction.status === "live" ? "live" : "ended"}>
                  {auction.status}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  {auction.status === "live" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionLoading === auction.id}
                      onClick={() => onEnd(auction.id)}
                    >
                      End now
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={actionLoading === auction.id}
                    onClick={() => onRemove(auction.id)}
                  >
                    Remove
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTable({
  users,
  actionLoading,
  onToggleSeller,
}: {
  users: AdminUser[];
  actionLoading: string | null;
  onToggleSeller: (userId: string, isSeller: boolean) => void;
}) {
  if (users.length === 0) {
    return <EmptyState message="No users registered." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-brand-muted/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-5 py-3">User</th>
            <th className="px-5 py-3">Roles</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-brand-muted/30">
              <td className="px-5 py-4">
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {user.isAdmin ? <Badge variant="urgent">Admin</Badge> : null}
                  {user.isSeller ? <Badge>Seller</Badge> : null}
                  <Badge variant="default">Bidder</Badge>
                </div>
              </td>
              <td className="px-5 py-4 text-right">
                {!user.isAdmin ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading === user.id}
                    onClick={() => onToggleSeller(user.id, !user.isSeller)}
                  >
                    {user.isSeller ? "Revoke seller" : "Make seller"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: AdminPaymentOrder[] }) {
  if (payments.length === 0) {
    return (
      <EmptyState message="No payment orders yet. Orders appear when winners check out." />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-brand-muted/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-5 py-3">Order</th>
            <th className="px-5 py-3">Buyer</th>
            <th className="px-5 py-3">Amount</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((order) => (
            <tr key={order.id} className="hover:bg-brand-muted/30">
              <td className="px-5 py-4">
                <p className="font-semibold">{order.auctionTitle}</p>
                <p className="text-xs text-muted">{order.id}</p>
              </td>
              <td className="px-5 py-4 text-muted">{order.buyerName}</td>
              <td className="px-5 py-4 font-semibold tabular-nums">
                {formatCurrency(order.amount)}
              </td>
              <td className="px-5 py-4">
                <PaymentBadge status={order.status} />
              </td>
              <td className="px-5 py-4 text-xs text-muted">
                {new Date(order.createdAt).toLocaleString("fr-CM")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentBadge({ status }: { status: AdminPaymentOrder["status"] }) {
  if (status === "successful") {
    return <Badge variant="winning">Paid</Badge>;
  }
  if (status === "pending") {
    return <Badge variant="live">Pending</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="urgent">Failed</Badge>;
  }
  return <Badge variant="ended">{status}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-16 text-center text-sm text-muted">{message}</div>
  );
}
