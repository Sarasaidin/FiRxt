export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";

export const metadata = { title: "Pending Partner Approvals" };

export default async function PendingPartnersPage() {
  const partners = await prisma.partner.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { email: true, phone: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">
        Pending Approvals ({partners.length})
      </h1>

      {partners.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          All caught up! No pending partner registrations.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-brand-navy">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.type.replace("_", " ")} · {p.city}, {p.state}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {format(new Date(p.createdAt), "d MMM yyyy")}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>📧 {p.user.email}</p>
                {p.phone && <p>📞 {p.phone}</p>}
                <p>📍 {p.addressLine1}, {p.city}, {p.state} {p.postcode}</p>
              </div>

              <Link href={`/admin/partners/${p.id}`}>
                <button className="w-full rounded-lg bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90 transition-colors">
                  Review Application
                </button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
