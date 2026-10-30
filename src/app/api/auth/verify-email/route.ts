import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateSixDigitCode() {
  return randomInt(100000, 1000000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const action = String(body.action ?? "send");

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    if (action === "verify") {
      const code = String(body.code ?? "").trim();

      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Enter the 6-digit verification code." },
          { status: 400 },
        );
      }

      const saved = await prisma.emailVerification.findUnique({
        where: { email },
      });

      if (!saved || saved.consumedAt || saved.verifiedAt) {
        return NextResponse.json(
          { error: "No active verification code. Please request a new one." },
          { status: 400 },
        );
      }

      if (saved.expiresAt.getTime() <= Date.now()) {
        await prisma.emailVerification.deleteMany({
          where: { id: saved.id, verifiedAt: null, consumedAt: null },
        });

        return NextResponse.json(
          {
            error:
              "Verification code has expired. Please request a new one.",
          },
          { status: 400 },
        );
      }

      if (saved.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "Too many attempts. Please request a new code." },
          { status: 429 },
        );
      }

      if (saved.codeHash !== hashCode(code)) {
        const updated = await prisma.emailVerification.updateMany({
          where: {
            id: saved.id,
            verifiedAt: null,
            consumedAt: null,
            attempts: { lt: MAX_ATTEMPTS },
          },
          data: { attempts: { increment: 1 } },
        });

        if (updated.count === 0) {
          return NextResponse.json(
            { error: "Too many attempts. Please request a new code." },
            { status: 429 },
          );
        }

        return NextResponse.json(
          { error: "Invalid verification code." },
          { status: 400 },
        );
      }

      const verified = await prisma.emailVerification.updateMany({
        where: {
          id: saved.id,
          codeHash: hashCode(code),
          verifiedAt: null,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
        data: { verifiedAt: new Date() },
      });

      if (verified.count !== 1) {
        return NextResponse.json(
          {
            error:
              "Verification code is no longer valid. Please request a new one.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        message: "Email verified successfully.",
      });
    }

    if (action !== "send") {
      return NextResponse.json(
        { error: "Unsupported verification action." },
        { status: 400 },
      );
    }

    const smtpHost = process.env.BREVO_SMTP_HOST;
    const smtpPort = Number(process.env.BREVO_SMTP_PORT || 587);
    const smtpLogin = process.env.BREVO_SMTP_LOGIN;
    const smtpKey = process.env.BREVO_SMTP_KEY;
    const fromEmail = process.env.BREVO_SENDER_EMAIL;

    if (
      !smtpHost ||
      !smtpLogin ||
      !smtpKey ||
      !fromEmail ||
      !Number.isInteger(smtpPort) ||
      smtpPort <= 0
    ) {
      return NextResponse.json(
        { error: "Email verification is temporarily unavailable." },
        { status: 503 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Unable to send a verification code to this address." },
        { status: 400 },
      );
    }

    const now = new Date();

    const existingVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (
      existingVerification &&
      now.getTime() - existingVerification.createdAt.getTime() <
        RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code." },
        { status: 429 },
      );
    }

    const code = generateSixDigitCode();

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpLogin,
        pass: smtpKey,
      },
    });

    await prisma.emailVerification.upsert({
      where: { email },
      create: {
        email,
        codeHash: hashCode(code),
        expiresAt: new Date(now.getTime() + CODE_EXPIRY_MS),
        attempts: 0,
        verifiedAt: null,
        consumedAt: null,
      },
      update: {
        codeHash: hashCode(code),
        expiresAt: new Date(now.getTime() + CODE_EXPIRY_MS),
        attempts: 0,
        verifiedAt: null,
        consumedAt: null,
        createdAt: now,
      },
    });

    try {
      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: "Your FiRxt account verification code",
        html: `
          <div style="font-family: Arial, sans-serif; color: #1f2a44; line-height: 1.6;">
            <h1 style="margin: 0 0 16px; font-size: 24px;">Verify your email</h1>
            <p>Use the verification code below to complete your FiRxt account registration.</p>
            <div style="margin: 24px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this code, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Brevo SMTP verification email failed:", {
        name: error instanceof Error ? error.name : "UnknownError",
      });

      await prisma.emailVerification.deleteMany({
        where: {
          email,
          codeHash: hashCode(code),
          verifiedAt: null,
          consumedAt: null,
        },
      });

      return NextResponse.json(
        { error: "Unable to send the verification email. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    console.error("User email verification error:", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}