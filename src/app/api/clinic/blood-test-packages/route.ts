
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPartnerContext } from "@/lib/active-partner";
import { prisma } from "@/lib/prisma";
import { bloodTestPackageSchema } from "@/lib/validations";

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

  // Revalidate ownership, type and approval against the database.
  const clinic = await prisma.partner.findFirst({
    where: {
      id: context.activePartner.id,
      userId: context.userId,
      type: "CLINIC",
      status: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      slug: true,
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

  return { error: null, clinic };
}

// GET: List packages owned by the selected clinic.
export async function GET() {
  try {
    const { error, clinic } = await getApprovedClinic();

    if (error || !clinic) return error;

    const packages = await prisma.bloodTestPackage.findMany({
      where: {
        ownerPartnerId: clinic.id,
      },
      include: {
        packageTests: {
          include: {
            labTest: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
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
            clinicId: clinic.id,
          },
          select: {
            id: true,
            priceOverride: true,
            isAvailable: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error("[clinic blood-test-packages GET]", error);

    return NextResponse.json(
      { error: "Unable to retrieve blood-test packages." },
      { status: 500 }
    );
  }
}

// POST: Create a clinic-owned package.
export async function POST(req: Request) {
  try {
    const { error, clinic } = await getApprovedClinic();

    if (error || !clinic) return error;

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please submit valid JSON." },
        { status: 400 }
      );
    }

    const validation = bloodTestPackageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Please correct the blood-test package details.",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;


    // Validate selected tests and create the package atomically.
    const bloodTestPackage = await prisma.$transaction(async (tx) => {
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
        return null;
      }

      return tx.bloodTestPackage.create({
        data: {
          name: data.name,
          description: data.description || null,
          price: data.price,
          originalPrice: data.originalPrice ?? null,
          preparationInstructions:
            data.preparationInstructions || null,
          sampleType: data.sampleType || null,
          turnaroundDays: data.turnaroundDays ?? null,

          ownerPartnerId: clinic.id,
          approvalStatus: "PENDING",
          visibility: data.visibility,
          isActive: true,

          packageTests: {
            create: data.labTestIds.map((labTestId, index) => ({
              labTestId,
              sortOrder: index,
            })),
          },

          clinicLinks: {
            create: {
              clinicId: clinic.id,
              priceOverride: null,
              isAvailable: false,
            },
          },
        },
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
          clinicLinks: true,
        },
      });
    });


    // Reject the request if any selected test is unavailable.
    if (!bloodTestPackage) {
      return NextResponse.json(
        {
          error:
            "One or more selected laboratory tests do not exist or are inactive.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Blood-test package created successfully. It is pending administrator approval.",
        package: bloodTestPackage,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A conflicting package or clinic offer already exists." },
        { status: 409 }
      );
    }

    console.error("[clinic blood-test-packages POST]", error);

    return NextResponse.json(
      { error: "Unable to create the blood-test package." },
      { status: 500 }
    );
  }
}
