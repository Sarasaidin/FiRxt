
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPartnerContext } from "@/lib/active-partner";
import { prisma } from "@/lib/prisma";
import { bloodTestPackageUpdateSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getApprovedClinic() {
  const context = await getPartnerContext();

  if (!context) {
    return {
      error: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
      clinic: null,
    };
  }

  if (!context.activePartner) {
    return {
      error: NextResponse.json(
        { error: "Please select an active clinic first." },
        { status: 400 }
      ),
      clinic: null,
    };
  }

  const clinic = await prisma.partner.findFirst({
    where: {
      id: context.activePartner.id,
      userId: context.userId,
      type: "CLINIC",
      status: "APPROVED",
    },
    select: {
      id: true,
    },
  });

  if (!clinic) {
    return {
      error: NextResponse.json(
        { error: "An approved clinic is required for this action." },
        { status: 403 }
      ),
      clinic: null,
    };
  }

  return {
    error: null,
    clinic,
  };
}

// PATCH: Update a clinic-owned package.
export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  try {
    const { error, clinic } = await getApprovedClinic();

    if (error || !clinic) {
      return error;
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Package ID is required." },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please submit valid JSON." },
        { status: 400 }
      );
    }

    const validation = bloodTestPackageUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Please correct the package details.",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Find the package owned by the active clinic.
    const existingPackage = await prisma.bloodTestPackage.findFirst({
      where: {
        id,
        ownerPartnerId: clinic.id,
      },
      select: {
        id: true,
        price: true,
        originalPrice: true,
        approvalStatus: true,
        isActive: true,
      },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: "Package not found." },
        { status: 404 }
      );
    }

    if (!existingPackage.isActive) {
      return NextResponse.json(
        { error: "Inactive packages cannot be edited." },
        { status: 409 }
      );
    }

    if (
      !["PENDING", "REJECTED"].includes(
        existingPackage.approvalStatus
      )
    ) {
      return NextResponse.json(
        {
          error: "Only pending or rejected packages can be edited.",
        },
        { status: 409 }
      );
    }

    // Validate the final package price.
    const finalPrice = data.price ?? existingPackage.price;

    const finalOriginalPrice =
      data.originalPrice !== undefined
        ? data.originalPrice
        : existingPackage.originalPrice;

    if (
      finalOriginalPrice !== null &&
      finalOriginalPrice !== undefined &&
      finalOriginalPrice <= finalPrice
    ) {
      return NextResponse.json(
        {
          error: "Original price must be greater than package price.",
        },
        { status: 400 }
      );
    }

    // Update the package inside a serializable transaction.
    const result = await prisma.$transaction(
      async (tx) => {
        // Confirm that all selected laboratory tests are active.
        if (data.labTestIds !== undefined) {
          const activeTests = await tx.labTest.findMany({
            where: {
              id: {
                in: data.labTestIds,
              },
              isActive: true,
            },
            select: {
              id: true,
            },
          });

          if (activeTests.length !== data.labTestIds.length) {
            return {
              status: "INVALID_TESTS" as const,
            };
          }
        }

        // Atomically verify that the package is still editable.
        const claim = await tx.bloodTestPackage.updateMany({
          where: {
            id: existingPackage.id,
            ownerPartnerId: clinic.id,
            isActive: true,
            approvalStatus: {
              in: ["PENDING", "REJECTED"],
            },
          },
          data: {
            approvalStatus: "PENDING",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          },
        });

        if (claim.count !== 1) {
          return {
            status: "CONFLICT" as const,
          };
        }

        // Prepare the package update.
        const updateData: Prisma.BloodTestPackageUpdateInput = {
          approvalStatus: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
        };

        if (data.name !== undefined) {
          updateData.name = data.name;
        }

        if (data.description !== undefined) {
          updateData.description = data.description || null;
        }

        if (data.price !== undefined) {
          updateData.price = data.price;
        }

        if (data.originalPrice !== undefined) {
          updateData.originalPrice = data.originalPrice;
        }

        if (data.preparationInstructions !== undefined) {
          updateData.preparationInstructions =
            data.preparationInstructions || null;
        }

        if (data.sampleType !== undefined) {
          updateData.sampleType = data.sampleType || null;
        }

        if (data.turnaroundDays !== undefined) {
          updateData.turnaroundDays = data.turnaroundDays;
        }

        if (data.visibility !== undefined) {
          updateData.visibility = data.visibility;
        }

        // Replace laboratory test associations when supplied.
        if (data.labTestIds !== undefined) {
          updateData.packageTests = {
            deleteMany: {},
            create: data.labTestIds.map((labTestId, index) => ({
              labTest: {
                connect: {
                  id: labTestId,
                },
              },
              sortOrder: index,
            })),
          };
        }

        // Save the updated package.
        const updated = await tx.bloodTestPackage.update({
          where: {
            id: existingPackage.id,
          },
          data: updateData,
          include: {
            packageTests: {
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
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        });

        // Keep the owner's offer unavailable pending reapproval.
        await tx.clinicPackage.updateMany({
          where: {
            clinicId: clinic.id,
            packageId: existingPackage.id,
          },
          data: {
            isAvailable: false,
          },
        });

        return {
          status: "UPDATED" as const,
          package: updated,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (result.status === "INVALID_TESTS") {
      return NextResponse.json(
        {
          error:
            "One or more selected laboratory tests do not exist or are inactive.",
        },
        { status: 400 }
      );
    }

    if (result.status === "CONFLICT") {
      return NextResponse.json(
        {
          error:
            "This package has changed or is no longer editable. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message:
        "Package updated successfully and submitted for administrator approval.",
      package: result.package,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "The package was modified by another operation. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    console.error("[clinic blood-test-packages PATCH]", error);

    return NextResponse.json(
      { error: "Unable to update the blood-test package." },
      { status: 500 }
    );
  }
}

// DELETE: Soft-deactivate a clinic-owned package.
export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  try {
    const { error, clinic } = await getApprovedClinic();

    if (error || !clinic) {
      return error;
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Package ID is required." },
        { status: 400 }
      );
    }

    // Confirm that the package belongs to the active clinic.
    const existingPackage = await prisma.bloodTestPackage.findFirst({
      where: {
        id,
        ownerPartnerId: clinic.id,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: "Package not found." },
        { status: 404 }
      );
    }

    if (!existingPackage.isActive) {
      return NextResponse.json(
        { error: "Package is already inactive." },
        { status: 409 }
      );
    }

    // Deactivate the package and all clinic offers atomically.
    const deactivated = await prisma.$transaction(
      async (tx) => {
        const result = await tx.bloodTestPackage.updateMany({
          where: {
            id: existingPackage.id,
            ownerPartnerId: clinic.id,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        if (result.count !== 1) {
          return false;
        }

        await tx.clinicPackage.updateMany({
          where: {
            packageId: existingPackage.id,
          },
          data: {
            isAvailable: false,
          },
        });

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (!deactivated) {
      return NextResponse.json(
        {
          error:
            "This package has changed or is already inactive. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message:
        "Package deactivated successfully. Historical orders and records have been preserved.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "The package was modified by another operation. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    console.error("[clinic blood-test-packages DELETE]", error);

    return NextResponse.json(
      { error: "Unable to deactivate the blood-test package." },
      { status: 500 }
    );
  }
}
