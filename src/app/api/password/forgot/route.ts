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

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl = `${appUrl}/reset-password/${rawToken}`;

    // Useful for local testing
    console.log("Password reset link:", resetUrl);

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendApiKey && resendFromEmail) {
      try {
        const resend = new Resend(resendApiKey);

        const result = await resend.emails.send({
          from: resendFromEmail,
          to: user.email,
          subject: "Reset your FiRxt password",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Reset your FiRxt password</h2>

              <p>Hi ${user.name || "there"},</p>

              <p>
                We received a request to reset your password. Click the button below
                to create a new password.
              </p>

              <p>
                <a href="${resetUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
                  Reset password
                </a>
              </p>

              <p>
                This link will expire in 1 hour. If you did not request this,
                you can ignore this email.
              </p>

              <p>FiRxt Team</p>
            </div>
          `,
        });

        if (result.error) {
          console.error("Resend email error:", result.error);
        }
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    return NextResponse.json({
      message: safeMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}