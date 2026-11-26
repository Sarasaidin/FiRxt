import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blood Test Packages | FiRxt",
  description:
    "Explore available blood test packages from approved clinics on FiRxt.",
};

export default async function BloodTestsPage() {
  const offers = await prisma.clinicPackage.findMany({
    where: {
      isAvailable: true,
      clinic: {
        type: "CLINIC",
        status: "APPROVED",
      },
      package: {
        isActive: true,
        approvalStatus: "APPROVED",
      },
    },
    include: {
      clinic: {
        select: {
          id: true,
          name: true,
          slug: true,
          addressLine1: true,
          city: true,
          state: true,
        },
      },
      package: {
        include: {
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
                  description: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Private packages may only be sold by their owner clinic.
  const eligibleOffers = offers.filter(
    (offer) =>
      offer.package.visibility === "SHARED" ||
      offer.package.ownerPartnerId === offer.clinicId
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-green">
          Health Screening
        </p>

        <h1 className="text-3xl font-bold text-brand-navy">
          Blood Test Packages
        </h1>

        <p className="mt-2 max-w-2xl text-gray-600">
          Explore blood test packages offered by approved clinics.
          Compare package details, included tests and clinic prices
          before making your selection.
        </p>
      </div>

      {eligibleOffers.length === 0 ? (
        <Card className="p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-navy">
            No blood test packages available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            There are currently no approved packages available for purchase.
            Please check again later.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block text-sm font-medium text-brand-green hover:underline"
          >
            Return to homepage
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {eligibleOffers.map((offer) => {
            const bloodTestPackage = offer.package;
            const price = offer.priceOverride ?? bloodTestPackage.price;

            return (
              <Card
                key={offer.id}
                className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="flex-1 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-medium text-brand-green">
                      Blood Test Package
                    </span>

                    {bloodTestPackage.visibility === "SHARED" && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Shared Package
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-brand-navy">
                    {bloodTestPackage.name}
                  </h2>

                  <p className="mt-2 line-clamp-3 min-h-[60px] text-sm text-gray-600">
                    {bloodTestPackage.description ||
                      "No package description available."}
                  </p>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Included Tests ({bloodTestPackage.packageTests.length})
                    </h3>

                    {bloodTestPackage.packageTests.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {bloodTestPackage.packageTests.map((item) => (
                          <li key={item.id} className="text-sm text-gray-600">
                            <span className="font-medium text-brand-navy">
                              {item.labTest.name}
                            </span>

                            {item.labTest.code && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({item.labTest.code})
                              </span>
                            )}

                            {item.notes && (
                              <p className="text-xs text-gray-500">
                                {item.notes}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        Test details are not available.
                      </p>
                    )}
                  </div>

                  {(bloodTestPackage.sampleType ||
                    bloodTestPackage.turnaroundDays ||
                    bloodTestPackage.preparationInstructions) && (
                    <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-xs text-gray-500">
                      {bloodTestPackage.sampleType && (
                        <p>
                          Sample type: {bloodTestPackage.sampleType}
                        </p>
                      )}

                      {bloodTestPackage.turnaroundDays && (
                        <p>
                          Turnaround: {bloodTestPackage.turnaroundDays} day(s)
                        </p>
                      )}

                      {bloodTestPackage.preparationInstructions && (
                        <p className="mt-2">
                          Preparation: {bloodTestPackage.preparationInstructions}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <p className="text-xs text-gray-500">
                    Offered by
                  </p>

                  <Link
                    href={`/partner/${offer.clinic.slug}`}
                    className="mt-1 inline-block text-sm font-semibold text-brand-navy hover:text-brand-green hover:underline"
                  >
                    {offer.clinic.name}
                  </Link>

                  <p className="mt-1 text-xs text-gray-500">
                    {offer.clinic.addressLine1}, {offer.clinic.city},{" "}
                    {offer.clinic.state}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      {bloodTestPackage.originalPrice &&
                        bloodTestPackage.originalPrice > price && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatCurrency(bloodTestPackage.originalPrice)}
                          </p>
                        )}

                      <p className="text-xl font-bold text-brand-green">
                        {formatCurrency(price)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <AddToCartButton
                      id={bloodTestPackage.id}
                      name={bloodTestPackage.name}
                      price={price}
                      type="BLOOD_TEST_PACKAGE"
                      partnerId={offer.clinic.id}
                      partnerName={offer.clinic.name}
                      partnerSlug={offer.clinic.slug}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
