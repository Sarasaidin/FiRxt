"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const clearCart = useCartStore((s) => s.clearCart);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearCart();
    if (sessionId) {
      fetch(`/api/checkout/verify?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          setOrder(data.order);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId, clearCart]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-brand-green mb-4" />
      <h1 className="text-3xl font-bold text-brand-navy mb-2">Order Confirmed!</h1>
      <p className="text-gray-600 mb-6">
        Thank you for your purchase. You&apos;ll receive a confirmation shortly.
      </p>

      {loading && (
        <Card className="p-6 mb-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </Card>
      )}

      {order && (
        <Card className="p-6 mb-4 text-left">
          <p className="font-bold text-brand-navy mb-1">Order #{order.orderNumber}</p>
          <p className="text-sm text-gray-500 mb-4">From {order.partner?.name}</p>
          <div className="space-y-2">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.product?.name ?? item.service?.name} × {item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand-green">{formatCurrency(order.total)}</span>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/orders">
          <Button variant="outline">View My Orders</Button>
        </Link>
        <Link href="/">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
