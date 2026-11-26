
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

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
            slug: true,
            type: true,
            status: true,
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
                isActive: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error(
      "Admin blood test packages GET error:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to retrieve blood test packages" },
      { status: 500 },
    );
  }
}
