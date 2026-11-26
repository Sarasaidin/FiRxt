
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReviewAction = "approve" | "reject";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Invalid package ID" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const action = body.action as ReviewAction;
    const rawReason = body.reason;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be approve or reject" },
        { status: 400 },
      );
    }

    let rejectionReason: string | null = null;

    if (action === "reject") {
      if (typeof rawReason !== "string" || !rawReason.trim()) {
        return NextResponse.json(
          { error: "A rejection reason is required" },
          { status: 400 },
        );
      }

      rejectionReason = rawReason.trim();

      if (rejectionReason.length > 1000) {
        return NextResponse.json(
          { error: "Rejection reason must not exceed 1000 characters" },
          { status: 400 },
        );
      }
    } else if (rawReason !== undefined) {
      return NextResponse.json(
        { error: "A rejection reason is not accepted for approval" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const bloodTestPackage =
          await tx.bloodTestPackage.findUnique({
            where: { id },
            select: {
              id: true,
              approvalStatus: true,
              isActive: true,
              ownerPartnerId: true,
            },
          });

        if (!bloodTestPackage) {
          return {
            error: "Blood test package not found",
            status: 404,
          } as const;
        }

        if (
          !bloodTestPackage.isActive ||
          bloodTestPackage.approvalStatus !== "PENDING"
        ) {
          return {
            error: "This package is no longer pending review",
            status: 409,
          } as const;
        }

        if (!bloodTestPackage.ownerPartnerId) {
          return {
            error: "Package does not have an owning clinic",
            status: 409,
          } as const;
        }

        if (action === "approve") {
          const ownerClinic = await tx.partner.findFirst({
            where: {
              id: bloodTestPackage.ownerPartnerId,
              type: "CLINIC",
              status: "APPROVED",
            },
            select: { id: true },
          });

          if (!ownerClinic) {
            return {
              error: "The owning clinic is not an approved clinic",
              status: 409,
            } as const;
          }
        }

        const now = new Date();

        const updateResult =
          await tx.bloodTestPackage.updateMany({
            where: {
              id,
              isActive: true,
              approvalStatus: "PENDING",
              ownerPartnerId: bloodTestPackage.ownerPartnerId,
            },
            data:
              action === "approve"
                ? {
                    approvalStatus: "APPROVED",
                    reviewedBy: session.user.id,
                    reviewedAt: now,
                    rejectionReason: null,
                  }
                : {
                    approvalStatus: "REJECTED",
                    reviewedBy: session.user.id,
                    reviewedAt: now,
                    rejectionReason,
                  },
          });

        if (updateResult.count !== 1) {
          return {
            error: "Package review conflict. Please refresh and try again.",
            status: 409,
          } as const;
        }

        if (action === "approve") {
          await tx.clinicPackage.updateMany({
            where: {
              packageId: id,
              clinicId: bloodTestPackage.ownerPartnerId,
            },
            data: {
              isAvailable: true,
            },
          });
        } else {
          await tx.clinicPackage.updateMany({
            where: {
              packageId: id,
              clinicId: bloodTestPackage.ownerPartnerId,
            },
            data: {
              isAvailable: false,
            },
          });
        }

        const updatedPackage =
          await tx.bloodTestPackage.findUnique({
            where: { id },
            include: {
              ownerPartner: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  status: true,
                },
              },
              packageTests: {
                orderBy: { sortOrder: "asc" },
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

        return { package: updatedPackage } as const;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      message:
        action === "approve"
          ? "Blood test package approved successfully"
          : "Blood test package rejected successfully",
      package: result.package,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Review conflict. Please refresh and try again." },
        { status: 409 },
      );
    }

    console.error("Admin blood test package review error:", error);

    return NextResponse.json(
      { error: "Failed to review blood test package" },
      { status: 500 },
    );
  }
}
