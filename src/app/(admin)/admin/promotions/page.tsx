export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Admin — Promotions" };

export default async function AdminPromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { name: true } } },
  });

  const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
    ACTIVE: "green", DRAFT: "yellow", EXPIRED: "gray", CANCELLED: "red",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Promotions</h1>
        <Link href="/admin/promotions/new">
          <Button><Plus className="mr-1.5 h-4 w-4" /> New Promotion</Button>
        </Link>
      </div>

      {promotions.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No promotions yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Title", "Partner", "Type", "Discount", "Code", "Usage", "Dates", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promotions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-brand-navy">{p.title}</td>
                  <td className="px-4 py-3 text-gray-600">{p.partner?.name ?? "Platform-wide"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.type === "PERCENTAGE" ? `${p.discountValue}%` : formatCurrency(p.discountValue)}
                  </td>
                  <td className="px-4 py-3">
                    {p.code ? (
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{p.code}</code>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.usageCount}/{p.usageLimit ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(p.startDate), "d MMM")} – {format(new Date(p.endDate), "d MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status] ?? "gray"}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
