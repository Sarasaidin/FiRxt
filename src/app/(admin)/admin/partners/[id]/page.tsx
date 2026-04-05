"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { MapPin, Phone, Mail, Globe } from "lucide-react";

export default function AdminPartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetch(`/api/partners/${id}`).then((r) => r.json()).then((d) => setPartner(d.partner));
  }, [id]);

  async function handleAction(action: "approve" | "reject") {
    setLoading(true);
    const res = await fetch(`/api/partners/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: rejectReason }),
    });
    setLoading(false);
    if (res.ok) {
      toast(action === "approve" ? "Partner approved!" : "Partner rejected", action === "approve" ? "success" : "error");
      router.push("/admin/partners");
    } else {
      toast("Action failed", "error");
    }
  }

  if (!partner) return <div className="p-8 text-gray-400">Loading...</div>;

  const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
    APPROVED: "green", PENDING: "yellow", REJECTED: "red", SUSPENDED: "gray",
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">{partner.name}</h1>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Badge variant="blue">{partner.type?.replace("_", " ")}</Badge>
              <Badge variant={statusVariant[partner.status] ?? "gray"} className="ml-2">{partner.status}</Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {partner.addressLine1}, {partner.city}, {partner.state} {partner.postcode}</p>
            {partner.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {partner.phone}</p>}
            {partner.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {partner.email}</p>}
            {partner.website && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" /> <a href={partner.website} className="text-brand-green hover:underline" target="_blank" rel="noopener noreferrer">{partner.website}</a></p>}
          </div>

          {partner.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">{partner.description}</p>
            </div>
          )}
        </Card>

        {partner.status === "PENDING" && (
          <Card className="p-5">
            <h2 className="font-bold text-brand-navy mb-4">Review Decision</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason (required if rejecting)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                placeholder="Reason for rejection..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={() => handleAction("reject")}
                loading={loading}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
              <Button
                onClick={() => handleAction("approve")}
                loading={loading}
              >
                ✓ Approve Partner
              </Button>
            </div>
          </Card>
        )}

        {partner.status === "APPROVED" && (
          <Card className="p-5 border-brand-green/30">
            <div className="flex items-center gap-2 text-brand-green">
              <span className="text-lg">✓</span>
              <p className="font-medium">Partner is approved and active</p>
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="danger" onClick={() => handleAction("reject")} loading={loading}>Suspend Partner</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
