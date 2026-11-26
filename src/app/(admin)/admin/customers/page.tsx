
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import DeleteCustomerButton from "./DeleteCustomerButton";

export const metadata = { title: "Admin — Customers" };

export default async function AdminCustomersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">
        Customers ({users.length})
      </h1>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Role",
                  "Orders",
                  "Joined",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {user.name ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {user.email}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.role === "ADMIN"
                          ? "red"
                          : user.role === "PARTNER"
                            ? "blue"
                            : "gray"
                      }
                    >
                      {user.role}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {user._count.orders}
                  </td>

                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(user.createdAt), "d MMM yyyy")}
                  </td>

                  <td className="px-4 py-3">
                    {user.role === "CUSTOMER" ? (
                      <DeleteCustomerButton
                        userId={user.id}
                        userName={user.name ?? user.email}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
