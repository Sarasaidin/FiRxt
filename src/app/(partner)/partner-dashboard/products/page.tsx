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

export const metadata = { title: "Products" };

export default async function PartnerProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const products = await prisma.product.findMany({
    where: { partnerId: session.user.partnerId },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Products</h1>
        <Link href="/partner-dashboard/products/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 mb-4">No products yet.</p>
          <Link href="/partner-dashboard/products/new">
            <Button>Add your first product</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Product", "Category", "Price", "Stock", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-brand-navy">{p.name}</p>
                      {p.brand && <p className="text-xs text-gray-500">{p.brand}</p>}
                      {p.requiresPrescription && (
                        <Badge variant="yellow" className="text-xs mt-1">Rx Required</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock === 0 ? "text-brand-red font-medium" : "text-gray-700"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? "green" : "gray"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/partner-dashboard/products/${p.id}`} className="text-brand-green hover:underline text-sm">
                      Edit
                    </Link>
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
