"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/components/ui/toaster";

const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function PartnerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then((d) => {
      setOrder(d.order);
      setNewStatus(d.order?.status ?? "");
    });
  }, [id]);

  async function handleUpdateStatus() {
    setUpdating(true);
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, note }),
    });
    setUpdating(false);
    if (res.ok) {
      toast("Status updated!", "success");
      router.refresh();
    } else {
      toast("Update failed", "error");
    }
  }

  if (!order) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-2">Order #{order.orderNumber}</h1>
      <p className="text-sm text-gray-500 mb-6">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</p>

      <Card className="p-6 mb-4">
        <h2 className="font-bold text-brand-navy mb-3">Items</h2>
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
          <span>{formatCurrency(order.total)}</span>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-brand-navy mb-4">Update Status</h2>
        <div className="flex flex-col gap-3">
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={ORDER_STATUSES}
            label="New Status"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              placeholder="Add a note about this status change..."
            />
          </div>
          <Button onClick={handleUpdateStatus} loading={updating}>Update Status</Button>
        </div>
      </Card>
    </div>
  );
}
