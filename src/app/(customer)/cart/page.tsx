"use client";

import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  TicketPercent,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } =
    useCartStore();

  const { data: session } = useSession();
  const router = useRouter();

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = subtotal();

  function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase();

    setError("");
    setPromoMessage("");

    if (!code) {
      setError("Please enter a voucher code.");
      return;
    }

    setAppliedPromoCode(code);
    setPromoMessage(
      "Voucher applied. The final discount will be validated at checkout."
    );
  }

  function handleRemovePromo() {
    setAppliedPromoCode("");
    setPromoCode("");
    setPromoMessage("");
    setError("");
  }

  async function handleCheckout() {
    if (!session) {
      router.push("/login?callbackUrl=/cart");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const partnerId = items[0]?.partnerId;

    if (!partnerId) {
      setError("Missing partner information.");
      return;
    }

    const hasDifferentPartners = items.some(
      (item) => item.partnerId !== partnerId
    );

    if (hasDifferentPartners) {
      setError("Please checkout items from one merchant at a time.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerId,
          items: items.map((item) => ({
            id: item.id,
            type: item.type,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          })),
          promoCode: appliedPromoCode || undefined,
        }),
      });

      const raw = await res.text();

      let json: any = {};

      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        console.error("Non-JSON checkout response:", raw);
        setError(
          "Checkout endpoint returned an invalid response. Check browser console."
        );
        return;
      }

      if (!res.ok) {
        setError(json.error ?? "Checkout failed");
        return;
      }

      if (!json.url) {
        setError("Checkout session was created, but no payment URL was returned.");
        return;
      }

      window.location.href = json.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Unable to proceed to checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-gray-300" />

        <h1 className="mb-2 text-2xl font-bold text-gray-700">
          Your cart is empty
        </h1>

        <p className="mb-6 text-gray-500">
          Browse our partners to find health products and services.
        </p>

        <Link href="/">
          <Button>Browse Partners</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <Card
              key={`${item.id}-${item.type}`}
              className="flex items-center gap-4 p-4"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={72}
                  height={72}
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                  {item.type === "SERVICE" ? "🏥" : "💊"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-brand-navy">
                  {item.name}
                </p>

                <p className="text-xs text-gray-500">{item.partnerName}</p>

                <p className="mt-1 font-bold text-brand-green">
                  {formatCurrency(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 transition-colors hover:border-brand-green"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <span className="w-6 text-center text-sm font-medium">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 transition-colors hover:border-brand-green"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <p className="w-20 text-right text-sm font-bold">
                {formatCurrency(item.price * item.quantity)}
              </p>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-gray-400 transition-colors hover:text-brand-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}

          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-gray-400 transition-colors hover:text-brand-red"
          >
            Clear cart
          </button>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 p-5">
            <h2 className="mb-4 font-bold text-brand-navy">
              Order Summary
            </h2>

            {/* Voucher input */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Voucher code
              </label>

              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) =>
                    setPromoCode(e.target.value.toUpperCase())
                  }
                  placeholder="Enter code"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/20"
                />

                <Button
                  type="button"
                  onClick={handleApplyPromo}
                  variant="outline"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Applied voucher preview */}
            {appliedPromoCode && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="mt-0.5 rounded-full bg-green-100 p-1">
                      <CheckCircle2 className="h-4 w-4 text-brand-green" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        Voucher applied
                      </p>

                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white">
                        <TicketPercent className="h-4 w-4" />
                        {appliedPromoCode}
                      </div>

                      {promoMessage && (
                        <p className="mt-2 text-xs text-green-700">
                          {promoMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-gray-400 transition-colors hover:text-brand-red"
                    aria-label="Remove voucher"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {appliedPromoCode && (
                <div className="flex justify-between text-brand-green">
                  <span>Voucher</span>
                  <span>{appliedPromoCode}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Fulfilment</span>
                <span className="text-brand-green">
                  In-store collection / visit
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-bold text-brand-navy">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {appliedPromoCode && (
              <p className="mt-2 text-xs text-gray-500">
                Final discount amount will be confirmed during checkout.
              </p>
            )}

            {error && (
              <p className="mt-2 text-xs text-brand-red">{error}</p>
            )}

            <Button
              onClick={handleCheckout}
              loading={loading}
              disabled={loading}
              className="mt-4 w-full"
              size="lg"
            >
              {loading
                ? "Redirecting..."
                : session
                ? "Proceed to Checkout"
                : "Sign in to Checkout"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}