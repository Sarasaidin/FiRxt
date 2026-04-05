export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export const metadata = { title: "Admin — Partners" };

interface Props { searchParams: Promise<{ status?: string }> }

export default async function AdminPartnersPage({ searchParams }: Props) {
  const { status } = await searchParams;

  const partners = await prisma.partner.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } }, _count: { select: { products: true, orders: true } } },
  });

  const statusVariant: Record<string, "green" | "red" | "yellow" | "blue" | "gray"> = {
    APPROVED: "green", PENDING: "yellow", REJECTED: "red", SUSPENDED: "gray",
  };

  const statusTabs = ["", "APPROVED", "PENDING", "REJECTED", "SUSPENDED"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Partners</h1>
        <Link href="/admin/partners/pending" className="text-sm text-brand-green hover:underline font-medium">
          Pending Queue
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusTabs.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/admin/partners?status=${s}` : "/admin/partners"}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (status ?? "") === s
                ? "bg-brand-navy text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-navy"
            }`}
          >
            {s || "All"} ({
              s
                ? partners.filter((p) => p.status === s).length
                : partners.length
            })
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Partner", "Type", "Location", "Products", "Orders", "Status", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-brand-navy">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.type.replace("_", " ")}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.city}, {p.state}</td>
                <td className="px-4 py-3 text-gray-600">{p._count.products}</td>
                <td className="px-4 py-3 text-gray-600">{p._count.orders}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[p.status] ?? "gray"}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(p.createdAt), "d MMM yyyy")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/partners/${p.id}`} className="text-brand-green hover:underline text-sm">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 && (
          <p className="p-8 text-center text-gray-500">No partners found.</p>
        )}
      </Card>
    </div>
  );
}
