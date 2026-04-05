"use client";

import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = subtotal();

  async function handleCheckout() {
    if (!session) {
      router.push("/login?callbackUrl=/cart");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, type: i.type, quantity: i.quantity, price: i.price })),
        promoCode: promoCode || undefined,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Checkout failed");
      return;
    }

    window.location.href = json.url;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Browse our partners to find health products and services.</p>
        <Link href="/">
          <Button>Browse Partners</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center gap-4 p-4">
              {item.image ? (
                <Image src={item.image} alt={item.name} width={72} height={72} className="h-18 w-18 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                  {item.type === "SERVICE" ? "🏥" : "💊"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-navy text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.partnerName}</p>
                <p className="font-bold text-brand-green mt-1">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 hover:border-brand-green transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 hover:border-brand-green transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="font-bold text-sm w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-400 hover:text-brand-red transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}

          <button
            onClick={clearCart}
            className="text-sm text-gray-400 hover:text-brand-red transition-colors"
          >
            Clear cart
          </button>
        </div>

        {/* Summary */}
        <div>
          <Card className="p-5 sticky top-4">
            <h2 className="font-bold text-brand-navy mb-4">Order Summary</h2>

            {/* Promo code */}
            <div className="flex gap-2 mb-4">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Promo code"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/20"
              />
            </div>

            <div className="space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-brand-green">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-brand-navy mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {error && (
              <p className="mt-2 text-xs text-brand-red">{error}</p>
            )}

            <Button
              onClick={handleCheckout}
              loading={loading}
              className="w-full mt-4"
              size="lg"
            >
              {session ? "Proceed to Checkout" : "Sign in to Checkout"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
