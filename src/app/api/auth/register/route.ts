
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const verification = await tx.emailVerification.findUnique({
        where: { email },
      });

      if (
        !verification ||
        !verification.verifiedAt ||
        verification.consumedAt ||
        verification.expiresAt <= now
      ) {
        throw new Error("EMAIL_VERIFICATION_REQUIRED");
      }

      const consumed = await tx.emailVerification.updateMany({
        where: {
          id: verification.id,
          email,
          verifiedAt: verification.verifiedAt,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new Error("EMAIL_VERIFICATION_REQUIRED");
      }

      return tx.user.create({
        data: {
          name: data.name,
          email,
          phone: data.phone,
          passwordHash,
          role: "CUSTOMER",
          emailVerified: verification.verifiedAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_VERIFICATION_REQUIRED"
    ) {
      return NextResponse.json(
        { error: "Please verify your email before creating an account." },
        { status: 403 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ZodError"
    ) {
      return NextResponse.json(
        { error: (error as { issues?: unknown }).issues },
        { status: 400 },
      );
    }

    console.error("[register]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
