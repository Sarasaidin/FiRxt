"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  CalendarDays,
  PackageCheck,
  Store,
  TicketPercent,
  ReceiptText,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type CheckoutOrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    name: string;
    images?: string[];
  } | null;
  service?: {
    name: string;
    images?: string[];
  } | null;
};

type CheckoutOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentType?: string | null;
  subtotal?: number | null;
  discountAmount?: number | null;
  total: number;
  createdAt?: string;
  partner?: {
    name: string;
    slug: string;
  } | null;
  promotion?: {
    id: string;
    title: string;
    code: string | null;
    type: string;
    discountValue: number;
  } | null;
  items?: CheckoutOrderItem[];
};

function getItemName(item: CheckoutOrderItem) {
  return item.product?.name ?? item.service?.name ?? "Item";
}

function getFulfilmentLabel(value?: string | null) {
  if (!value) return "Reserve & Collect";

  if (value === "IN_STORE_PICKUP") return "Reserve & Collect";
  if (value === "IN_STORE_VISIT") return "Attend appointment in person";
  if (value === "HOME_DELIVERY") return "Home Delivery";

  // Fallback for old saved values, just in case older orders still use these.
  if (value === "PICKUP") return "Reserve & Collect";
  if (value === "BOOKING") return "Attend appointment in person";
  if (value === "DELIVERY") return "Home Delivery";

  return "Reserve & Collect";
}

function getOrderStatusLabel(value?: string | null) {
  if (!value) return "Confirmed";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const clearCart = useCartStore((state) => state.clearCart);

  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    clearCart();

    if (!sessionId) {
      setLoading(false);
      setError("Missing checkout session.");
      return;
    }

    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }

        setOrder(data.order);
        setPaymentStatus(data.status ?? "");
      })
      .catch(() => {
        setError("Unable to verify checkout session.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-green/30 border-t-brand-green" />

          <h1 className="text-xl font-bold text-brand-navy">
            Verifying your payment...
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Please wait while we confirm your order details.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card className="p-10 text-center">
          <ReceiptText className="mx-auto mb-4 h-12 w-12 text-brand-red" />

          <h1 className="text-xl font-bold text-brand-navy">
            Unable to load order confirmation
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error || "Order details could not be found."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/orders">
              <Button variant="outline">View My Orders</Button>
            </Link>

            <Link href="/">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const subtotal = order.subtotal ?? order.total + (order.discountAmount ?? 0);
  const discountAmount = order.discountAmount ?? 0;
  const finalTotal = order.total;
  const hasVoucher = Boolean(order.promotion || discountAmount > 0);
  const fulfilmentLabel = getFulfilmentLabel(order.fulfillmentType);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Card className="overflow-hidden">
        <div className="bg-green-50 px-6 py-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-brand-green" />

          <h1 className="mt-4 text-3xl font-bold text-brand-navy">
            Order Confirmed!
          </h1>

          <p className="mt-2 text-gray-600">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm">
            Order #{order.orderNumber}
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h2 className="mb-3 text-lg font-bold text-brand-navy">
                Order Details
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Store className="h-4 w-4 text-brand-green" />
                    Partner
                  </div>

                  {order.partner ? (
                    <Link
                      href={`/partner/${order.partner.slug}`}
                      className="mt-1 block font-semibold text-brand-navy hover:text-brand-green"
                    >
                      {order.partner.name}
                    </Link>
                  ) : (
                    <p className="mt-1 font-semibold text-brand-navy">
                      Partner unavailable
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <PackageCheck className="h-4 w-4 text-brand-green" />
                    Fulfilment
                  </div>

                  <p className="mt-1 font-semibold text-brand-navy">
                    {fulfilmentLabel}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <ReceiptText className="h-4 w-4 text-brand-green" />
                    Payment
                  </div>

                  <p className="mt-1 font-semibold capitalize text-brand-navy">
                    {paymentStatus || order.paymentStatus || "Confirmed"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <CalendarDays className="h-4 w-4 text-brand-green" />
                    Order Status
                  </div>

                  <p className="mt-1 font-semibold text-brand-navy">
                    {getOrderStatusLabel(order.status)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-brand-navy">
                Items Purchased
              </h2>

              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-semibold text-brand-navy">
                        {getItemName(item)}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Quantity: {item.quantity} ×{" "}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>

                    <p className="shrink-0 font-bold text-brand-navy">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-brand-navy">
                Payment Summary
              </h2>

              {hasVoucher && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <TicketPercent className="mt-0.5 h-5 w-5 text-brand-green" />

                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        Voucher applied
                      </p>

                      {order.promotion?.code && (
                        <code className="mt-2 inline-block rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white">
                          {order.promotion.code}
                        </code>
                      )}

                      {order.promotion?.title && (
                        <p className="mt-2 text-xs text-green-700">
                          {order.promotion.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {hasVoucher && (
                  <div className="flex justify-between text-brand-green">
                    <span>Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Fulfilment</span>
                  <span className="text-right text-brand-green">
                    {fulfilmentLabel}
                  </span>
                </div>

                <div className="flex justify-between border-t border-gray-200 pt-4 text-lg font-bold text-brand-navy">
                  <span>Total paid</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href="/orders" className="block">
                  <Button className="w-full">View My Orders</Button>
                </Link>

                <Link href="/" className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CheckoutSuccessContent;