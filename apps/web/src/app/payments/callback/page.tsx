import { Suspense } from "react";
import { PaymentCallbackClient } from "./payment-callback-client";

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted">
          Loading payment status...
        </div>
      }
    >
      <PaymentCallbackClient />
    </Suspense>
  );
}
