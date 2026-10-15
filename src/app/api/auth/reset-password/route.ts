
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token =
      typeof body.token === "string" ? body.token : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!token || !passwordPattern.test(password)) {
      return NextResponse.json(
        {
          error:
            "Provide a valid reset token and a password with at least 12 characters, including uppercase, lowercase, a number, and a special character.",
        },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Use a transaction to prevent partial updates.
    await prisma.$transaction(async (tx) => {
      const result = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (result.count !== 1) {
        throw new Error("RESET_TOKEN_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      // Remove all outstanding reset tokens for this user.
      await tx.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      });
    });

    return NextResponse.json({
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RESET_TOKEN_ALREADY_USED"
    ) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    console.error("Password reset failed:", error);

    return NextResponse.json(
      { error: "Unable to reset the password right now." },
      { status: 500 }
    );
  }
}
