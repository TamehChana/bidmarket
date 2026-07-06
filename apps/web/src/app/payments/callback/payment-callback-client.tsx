"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { PaymentOrder } from "@bidmarket/shared";
import { formatCurrency } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function PaymentCallbackClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isMock = searchParams.get("mock") === "1";
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token || !orderId) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    api
      .getPaymentOrder(orderId, token)
      .then(setOrder)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load order"),
      )
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, token, orderId]);

  async function handleMockConfirm() {
    if (!token || !orderId) return;
    setConfirming(true);
    setError(null);
    try {
      const updated = await api.mockConfirmPayment(orderId, token);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-muted">Checking payment status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-muted">
          Sign in to view your payment status.
        </p>
        <Link href="/" className="mt-6 inline-block text-accent">
          Go home
        </Link>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-urgent" />
        <h1 className="mt-4 text-2xl font-semibold">Payment not found</h1>
        <p className="mt-2 text-muted">{error ?? "We could not find this order."}</p>
        <Link href="/me/bids">
          <Button className="mt-6">Go to My Bids</Button>
        </Link>
      </div>
    );
  }

  if (order.status === "successful") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-winning" />
        <h1 className="mt-4 text-2xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-muted">
          You paid {formatCurrency(order.amount)}. The seller will be notified.
        </p>
        <Link href={`/auctions/${order.auctionId}`}>
          <Button className="mt-6">View auction</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
      <h1 className="mt-4 text-2xl font-semibold">Payment pending</h1>
      <p className="mt-2 text-muted">
        Complete the payment on your phone via MTN MoMo or Orange Money. This
        page will update once Fapshi confirms your transaction.
      </p>
      <p className="mt-4 text-sm text-muted">
        Amount: {formatCurrency(order.amount)}
      </p>

      {isMock && order.status === "pending" ? (
        <Button
          className="mt-6"
          onClick={handleMockConfirm}
          disabled={confirming}
        >
          {confirming ? "Confirming..." : "Simulate successful payment (dev)"}
        </Button>
      ) : null}

      {error ? <p className="mt-4 text-sm text-urgent">{error}</p> : null}
    </div>
  );
}
