"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/components/ui/toaster";

type StatusOption = {
  value: string;
  label: string;
};

function getStatusOptions(order: any): StatusOption[] {
  const items = order?.items ?? [];
  const hasService = items.some(
    (item: any) => item.itemType === "SERVICE" || item.service
  );
  const hasPhysical = items.some(
    (item: any) => item.itemType === "PHYSICAL" || item.product
  );

  if (hasService && !hasPhysical) {
    return [
      { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }

  if (hasPhysical && !hasService) {
    return [
      { value: "READY_FOR_COLLECTION", label: "Ready for Collection" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }

  return [
    { value: "PAID", label: "Paid" },
    { value: "READY_FOR_COLLECTION", label: "Ready for Collection" },
    { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function PartnerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();

        setOrder(data.order);
        setNewStatus(data.order?.status ?? "");
      } catch (error) {
        console.error(error);
        toast("Failed to load order", "error");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  const statusOptions = useMemo(() => {
    if (!order) return [];
    return getStatusOptions(order);
  }, [order]);

  async function handleUpdateStatus() {
    try {
      setUpdating(true);

      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note }),
      });

      if (!res.ok) {
        toast("Update failed", "error");
        return;
      }

      const data = await res.json();

      if (data.order) {
        setOrder(data.order);
        setNewStatus(data.order.status);
      }

      toast("Status updated!", "success");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast("Update failed", "error");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!order) {
    return <div className="p-8 text-gray-400">Order not found.</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-brand-navy">
        Order #{order.orderNumber}
      </h1>
      <p className="mb-2 text-sm text-gray-500">
        {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}
      </p>
      <p className="mb-6 text-sm font-medium text-brand-green">
        Current Status: {formatStatus(order.status)}
      </p>

      <Card className="mb-4 p-6">
        <h2 className="mb-3 font-bold text-brand-navy">Items</h2>
        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.product?.name ?? item.service?.name} × {item.quantity}
              </span>
              <span className="font-medium">
                {formatCurrency(item.totalPrice)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 font-bold">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-bold text-brand-navy">Update Status</h2>
        <div className="flex flex-col gap-3">
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
            label="New Status"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              placeholder="Add a note about this status change..."
            />
          </div>

          <Button onClick={handleUpdateStatus} loading={updating}>
            Update Status
          </Button>
        </div>
      </Card>
    </div>
  );
}