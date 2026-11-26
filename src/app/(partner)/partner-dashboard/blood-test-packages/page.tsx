
import { getPartnerContext } from "@/lib/active-partner";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blood Test Packages" };

const approvalVariants: Record<
  string,
  "green" | "yellow" | "red" | "gray"
> = {
  APPROVED: "green",
  PENDING: "yellow",
  REJECTED: "red",
  SUSPENDED: "gray",
};

export default async function PartnerBloodTestPackagesPage() {
  const partnerContext = await getPartnerContext();
  const activePartner = partnerContext?.activePartner;

  if (
    !activePartner ||
    activePartner.status !== "APPROVED" ||
    activePartner.type !== "CLINIC"
  ) {
    redirect("/partner-dashboard");
  }

  const packages = await prisma.bloodTestPackage.findMany({
    where: {
      ownerPartnerId: activePartner.id,
    },
    include: {
      packageTests: {
        include: {
          labTest: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      clinicLinks: {
        where: {
          clinicId: activePartner.id,
        },
        select: {
          priceOverride: true,
          isAvailable: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = packages.filter(
    (item) => item.approvalStatus === "PENDING"
  ).length;

  const approvedCount = packages.filter(
    (item) => item.approvalStatus === "APPROVED"
  ).length;

  const rejectedCount = packages.filter(
    (item) =>
      item.approvalStatus === "REJECTED" ||
      item.approvalStatus === "SUSPENDED"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Blood Test Packages
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your clinic's blood-test packages.
          </p>
        </div>

        <Link href="/partner-dashboard/blood-test-packages/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Package
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Packages</p>
          <p className="text-2xl font-bold text-brand-navy">
            {packages.length}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600">
            {pendingCount}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {approvedCount}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Rejected / Suspended</p>
          <p className="text-2xl font-bold text-brand-red">
            {rejectedCount}
          </p>
        </Card>
      </div>

      {packages.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 mb-4">
            You haven't created any blood-test packages yet.
          </p>

          <Link href="/partner-dashboard/blood-test-packages/new">
            <Button>Create your first package</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Package",
                    "Included Tests",
                    "Price",
                    "Visibility",
                    "Approval",
                    "Availability",
                    "",
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
                {packages.map((item) => {
                  const offer = item.clinicLinks[0];
                  const displayPrice =
                    offer?.priceOverride ?? item.price;

                  const canEdit =
                    item.isActive &&
                    ["PENDING", "REJECTED"].includes(
                      item.approvalStatus
                    );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 min-w-48">
                        <p className="font-medium text-brand-navy">
                          {item.name}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {item.isActive ? "Active" : "Inactive"}
                        </p>
                      </td>

                      <td className="px-4 py-3 min-w-48">
                        <p className="font-medium">
                          {item.packageTests.length} tests
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {item.packageTests
                            .slice(0, 3)
                            .map((test) => test.labTest.name)
                            .join(", ")}

                          {item.packageTests.length > 3
                            ? ", ..."
                            : ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {formatCurrency(displayPrice)}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="gray">
                          {item.visibility}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            approvalVariants[item.approvalStatus] ??
                            "gray"
                          }
                        >
                          {item.approvalStatus}
                        </Badge>

                        {item.rejectionReason && (
                          <p
                            className="text-xs text-brand-red mt-1 max-w-40"
                            title={item.rejectionReason}
                          >
                            {item.rejectionReason}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            offer?.isAvailable ? "green" : "gray"
                          }
                        >
                          {offer?.isAvailable
                            ? "Available"
                            : "Unavailable"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {canEdit ? (
                          <Link
                            href={`/partner-dashboard/blood-test-packages/${item.id}`}
                            className="text-brand-green hover:underline text-sm"
                          >
                            Edit
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
