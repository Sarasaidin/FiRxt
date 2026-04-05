import { Suspense } from "react";
import { CheckoutSuccessContent } from "@/components/checkout/checkout-success-content";

export const metadata = { title: "Order Confirmed" };

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
