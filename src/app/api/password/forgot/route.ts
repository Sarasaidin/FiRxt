import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const safeMessage =
      "If an account exists with this email, a password reset link has been sent.";

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Do not reveal whether the email exists or not.
    if (!user) {
      return NextResponse.json({ message: safeMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    const identifier = `password-reset:${email}`;
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashedToken,
        expires,
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password/${rawToken}`;

    // Keep this for local debugging only.
    console.log("Password reset link:", resetUrl);

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "FiRxt <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is missing. Reset email was not sent.");
      return NextResponse.json({ message: safeMessage });
    }

    const resend = new Resend(resendApiKey);

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: user.email,
      subject: "Reset your FiRxt password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0B1D3B;">
          <h1 style="margin: 0 0 16px; font-size: 24px;">Reset your FiRxt password</h1>

          <p style="font-size: 15px; line-height: 1.6;">
            Hi ${user.name || "there"},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <p style="margin: 24px 0;">
            <a
              href="${resetUrl}"
              style="display: inline-block; background: #5FB346; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;"
            >
              Reset password
            </a>
          </p>

          <p style="font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:
          </p>

          <p style="word-break: break-all; font-size: 13px; color: #4B5563;">
            ${resetUrl}
          </p>

          <p style="font-size: 13px; color: #6B7280; line-height: 1.6;">
            This link will expire in 1 hour. If you did not request this, you can ignore this email.
          </p>

          <p style="margin-top: 24px; font-size: 14px;">
            FiRxt Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend email error:", error);
    }

    return NextResponse.json({ message: safeMessage });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}