
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";

export const metadata = {
  title: "Pending Blood Test Package Approvals",
};

export default async function PendingBloodTestPackagesPage() {
  const packages = await prisma.bloodTestPackage.findMany({
    where: {
      approvalStatus: "PENDING",
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      ownerPartner: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          city: true,
          state: true,
        },
      },
      packageTests: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          labTest: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
            },
          },
        },
      },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">
          Blood Test Package Approvals ({packages.length})
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review blood test packages submitted by approved clinics.
        </p>
      </div>

      {packages.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          All caught up! No pending blood test packages.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-brand-navy">
                    {pkg.name}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {pkg.visibility} package
                  </p>
                </div>

                <span className="shrink-0 text-xs text-gray-400">
                  {format(new Date(pkg.createdAt), "d MMM yyyy")}
                </span>
              </div>

              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">
                    Owning clinic:
                  </span>{" "}
                  {pkg.ownerPartner?.name ?? "Clinic information unavailable"}
                </div>

                {pkg.ownerPartner && (
                  <div className="text-xs text-gray-500">
                    {pkg.ownerPartner.type.replace("_", " ")} ·{" "}
                    {pkg.ownerPartner.city}, {pkg.ownerPartner.state}
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">
                    Package price:
                  </span>{" "}
                  RM {(pkg.price / 100).toFixed(2)}
                </div>

                {pkg.originalPrice && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Original price:
                    </span>{" "}
                    RM {(pkg.originalPrice / 100).toFixed(2)}
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">
                    Laboratory tests:
                  </span>{" "}
                  {pkg.packageTests.length}
                </div>

                <ul className="ml-5 list-disc space-y-1 text-xs text-gray-500">
                  {pkg.packageTests.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      {item.labTest.name} ({item.labTest.code})
                    </li>
                  ))}
                </ul>

                {pkg.packageTests.length > 4 && (
                  <p className="text-xs text-gray-500">
                    And {pkg.packageTests.length - 4} more tests
                  </p>
                )}
              </div>

              <Link
                href={`/admin/blood-test-packages/${pkg.id}`}
                className="block w-full rounded-lg bg-brand-navy px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-brand-navy/90"
              >
                Review Package
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
