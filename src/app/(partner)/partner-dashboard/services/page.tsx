export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export default async function PartnerServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const services = await prisma.service.findMany({
    where: { partnerId: session.user.partnerId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Services</h1>
        <Link href="/partner-dashboard/services/new">
          <Button><Plus className="mr-1.5 h-4 w-4" /> Add Service</Button>
        </Link>
      </div>

      {services.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 mb-4">No services yet.</p>
          <Link href="/partner-dashboard/services/new"><Button>Add your first service</Button></Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Service", "Duration", "Price", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-brand-navy">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.durationMinutes ? `${s.durationMinutes} min` : "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(s.price)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? "green" : "gray"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/partner-dashboard/services/${s.id}`} className="text-brand-green hover:underline text-sm">Edit</Link>
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
