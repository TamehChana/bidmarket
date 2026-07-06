"use client";

import { useEffect, useState } from "react";
import {
  formatTimeRemaining,
  getAuctionUrgency,
  getTimeRemaining,
  isAuctionEnded,
} from "@/lib/auction";

/** Avoid hydration mismatch: time is only computed after mount. */
export function useLiveCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(getTimeRemaining(endsAt));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return remaining;
}

interface CountdownTimerProps {
  endsAt: string;
  status: "scheduled" | "live" | "ended";
}

export function CountdownTimer({ endsAt, status }: CountdownTimerProps) {
  const remaining = useLiveCountdown(endsAt);
  const urgency = getAuctionUrgency(endsAt, status);
  const ended =
    status === "ended" || (remaining !== null && remaining <= 0);

  return (
    <span
      className={
        ended
          ? "text-muted"
          : urgency === "urgent"
            ? "font-medium text-urgent"
            : "text-foreground"
      }
    >
      {remaining === null
        ? "—"
        : ended
          ? "Ended"
          : formatTimeRemaining(remaining)}
    </span>
  );
}

export function useCountdown(endsAt: string, status: "scheduled" | "live" | "ended") {
  const remaining = useLiveCountdown(endsAt);

  return {
    remaining: remaining ?? 0,
    ended: status === "ended" || (remaining !== null && remaining <= 0),
    urgency: getAuctionUrgency(endsAt, status),
  };
}

export { isAuctionEnded };
