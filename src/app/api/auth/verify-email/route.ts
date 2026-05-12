import { NextResponse } from "next/server";
import { Resend } from "resend";

const verificationCodes = new Map<
  string,
  {
    code: string;
    expiresAt: number;
  }
>();

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "send");

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      const saved = verificationCodes.get(email);

      if (!saved) {
        return NextResponse.json(
          { error: "Verification code not found. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > saved.expiresAt) {
        verificationCodes.delete(email);

        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (saved.code !== code) {
        return NextResponse.json(
          { error: "Invalid verification code." },
          { status: 400 }
        );
      }

      verificationCodes.delete(email);

      return NextResponse.json({
        message: "Email verified successfully.",
      });
    }

    const code = generateSixDigitCode();

    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "FiRxt <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is missing. User verification email was not sent.");
      console.log(`User verification code for ${email}: ${code}`);

      return NextResponse.json({
        message:
          "Verification code generated. Please enter the 6-digit code before creating your account.",
      });
    }

    const resend = new Resend(resendApiKey);

    const { error } = await resend.emails.send({
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

    if (error) {
      console.error("Resend user verification email error:", error);
      console.log(`User verification code for ${email}: ${code}`);

      return NextResponse.json({
        message:
          "Verification code generated. Please enter the 6-digit code before creating your account.",
      });
    }

    return NextResponse.json({
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    console.error("User email verification error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}