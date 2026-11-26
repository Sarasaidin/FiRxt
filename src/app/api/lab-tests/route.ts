
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/lib/validations";


// GET: Retrieve active laboratory tests.
// Administrators may request both active and inactive tests.
export async function GET(req: Request) {
  const includeInactive =
    new URL(req.url).searchParams.get("includeInactive") === "true";

  if (includeInactive) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  try {
    const labTests = await prisma.labTest.findMany({
      where: includeInactive
        ? undefined
        : { isActive: true },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ labTests });
  } catch (error) {
    console.error("[lab-tests GET]", error);

    return NextResponse.json(
      { error: "Unable to retrieve laboratory tests." },
      { status: 500 }
    );
  }
}


// POST: Create a laboratory test (admin only).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
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

  const validation = labTestSchema.safeParse(body);

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
    const labTest = await prisma.labTest.create({
      data: {
        code: validation.data.code,
        name: validation.data.name,
        description: validation.data.description || null,
        category: validation.data.category || null,
      },
    });

    return NextResponse.json(
      {
        message: "Laboratory test created successfully.",
        labTest,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A laboratory test with this code already exists." },
        { status: 409 }
      );
    }

    console.error("[lab-tests POST]", error);

    return NextResponse.json(
      { error: "Unable to create laboratory test." },
      { status: 500 }
    );
  }
}
