
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { labTestUpdateSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

// PATCH: Update a laboratory test (admin only).
export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Laboratory test ID is required." },
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

  const validation = labTestUpdateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Please correct the laboratory test details.",
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const labTest = await prisma.labTest.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      message: "Laboratory test updated successfully.",
      labTest,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Laboratory test not found." },
        { status: 404 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A laboratory test with this code already exists." },
        { status: 409 }
      );
    }

    console.error("[lab-tests PATCH]", error);

    return NextResponse.json(
      { error: "Unable to update laboratory test." },
      { status: 500 }
    );
  }
}


// PUT: Reactivate a laboratory test (admin only).
export async function PUT(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Laboratory test ID is required." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.labTest.updateMany({
      where: {
        id,
        isActive: false,
      },
      data: {
        isActive: true,
      },
    });

    if (result.count === 0) {
      const existingTest = await prisma.labTest.findUnique({
        where: { id },
        select: { id: true, isActive: true },
      });

      if (!existingTest) {
        return NextResponse.json(
          { error: "Laboratory test not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Laboratory test is already active." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Laboratory test reactivated successfully.",
    });
  } catch (error) {
    console.error("[lab-tests PUT]", error);

    return NextResponse.json(
      { error: "Unable to reactivate laboratory test." },
      { status: 500 }
    );
  }
}


// DELETE: Soft-deactivate a laboratory test (admin only).
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Laboratory test ID is required." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.labTest.updateMany({
      where: {
        id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      const existingTest = await prisma.labTest.findUnique({
        where: { id },
        select: { id: true, isActive: true },
      });

      if (!existingTest) {
        return NextResponse.json(
          { error: "Laboratory test not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Laboratory test is already inactive." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Laboratory test deactivated successfully.",
    });
  } catch (error) {
    console.error("[lab-tests DELETE]", error);

    return NextResponse.json(
      { error: "Unable to deactivate laboratory test." },
      { status: 500 }
    );
  }
}
