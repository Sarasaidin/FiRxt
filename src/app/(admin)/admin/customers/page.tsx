export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const metadata = { title: "Admin — Customers" };

export default async function AdminCustomersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Customers ({users.length})</h1>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Name", "Email", "Role", "Orders", "Joined"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-brand-navy">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "ADMIN" ? "red" : u.role === "PARTNER" ? "blue" : "gray"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{u._count.orders}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(u.createdAt), "d MMM yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
