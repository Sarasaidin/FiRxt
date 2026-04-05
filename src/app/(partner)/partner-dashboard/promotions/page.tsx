export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export default async function PartnerPromotionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const promotions = await prisma.promotion.findMany({
    where: { OR: [{ partnerId: session.user.partnerId }, { partnerId: null }] },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
    ACTIVE: "green", DRAFT: "yellow", EXPIRED: "gray", CANCELLED: "red",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Promotions</h1>
      {promotions.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">No promotions available.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-brand-navy">{p.title}</h3>
                <Badge variant={statusVariant[p.status] ?? "gray"}>{p.status}</Badge>
              </div>
              {p.description && <p className="text-sm text-gray-600 mb-3">{p.description}</p>}
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{p.type === "PERCENTAGE" ? `${p.discountValue}% OFF` : formatCurrency(p.discountValue)}</span>
                {p.code && <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{p.code}</code>}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {format(new Date(p.startDate), "d MMM")} – {format(new Date(p.endDate), "d MMM yyyy")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
