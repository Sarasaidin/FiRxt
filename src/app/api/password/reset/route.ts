import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json(
        { error: "Invalid reset link." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        identifier: {
          startsWith: "password-reset:",
        },
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const email = verificationToken.identifier.replace("password-reset:", "");

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
      },
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: verificationToken.identifier,
      },
    });

    return NextResponse.json({
      message: "Password has been reset successfully. Redirecting to login...",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}