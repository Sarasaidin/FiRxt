
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
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

    const packageDetails = await prisma.bloodTestPackage.findUnique({
      where: { id },
      include: {
        ownerPartner: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            phone: true,
            email: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postcode: true,
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
                description: true,
                category: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!packageDetails) {
      return NextResponse.json(
        { error: "Blood test package not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      package: packageDetails,
    });
  } catch (error) {
    console.error("Admin blood test package detail error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve blood test package details" },
      { status: 500 },
    );
  }
}
