
import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Use the same response whether the account exists or not.
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists for that email, a password-reset link will be sent.",
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate existing reset tokens for this user.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (
      !process.env.BREVO_API_KEY ||
      !process.env.BREVO_SENDER_EMAIL ||
      !baseUrl
    ) {
      console.error("Password-reset email configuration is incomplete.");

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json(
        { error: "Unable to send the reset email right now." },
        { status: 500 }
      );
    }

    const resetUrl = new URL(
      `/reset-password/${rawToken}`,
      baseUrl
    );

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY!,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || "FiRxt",
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [{ email: user.email }],
          subject: "Reset Your FiRxt Password",
          htmlContent: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Reset Your FiRxt Password</title>
              </head>

              <body style="margin:0;padding:0;background-color:#F3F6FA;font-family:Arial,Helvetica,sans-serif;color:#344054;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3F6FA;padding:32px 12px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">

                        <!-- FiRxt branded header -->
                        <tr>
                          <td align="center" style="background-color:#FFFFFF;padding:28px 24px;">
                            <img
                              src="https://fi-rxt-marketplace.vercel.app/FiRxt-logo.png"
                              alt="FiRxt — Powered by WellAI"
                              width="200"
                              style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;"
                            />
                          </td>
                        </tr>

                        <!-- Main password-reset content -->
                        <tr>
                          <td style="padding:12px 32px 32px;">

                            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;font-weight:700;color:#0B1D3B;text-align:center;">
                              Reset Your Password
                            </h1>

                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#344054;">
                              Hello ${escapeHtml(user.name || "there")},
                            </p>

                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#344054;">
                              We received a request to reset the password associated with your FiRxt account.
                            </p>

                            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#344054;">
                              Click the button below to create a new password and regain access to your account.
                            </p>

                            <!-- Reset button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 24px;">
                              <tr>
                                <td align="center" bgcolor="#0B1D3B" style="border-radius:8px;">
                                  <a
                                    href="${resetUrl.toString()}"
                                    target="_blank"
                                    style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;"
                                  >
                                    Reset My Password
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:#667085;text-align:center;">
                              This password-reset link expires in <strong>15 minutes</strong> and can only be used once.
                            </p>

                            <p style="margin:24px 0 8px;font-size:13px;line-height:1.7;color:#667085;">
                              If the button does not work, copy and paste this link into your browser:
                            </p>

                            <p style="margin:0 0 24px;font-size:13px;line-height:1.7;word-break:break-all;">
                              <a href="${resetUrl.toString()}" target="_blank" style="color:#0B1D3B;text-decoration:underline;">
                                ${resetUrl.toString()}
                              </a>
                            </p>

                            <div style="border-top:1px solid #E5E7EB;padding-top:20px;">
                              <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#667085;">
                                <strong>Didn't request a password reset?</strong>
                              </p>

                              <p style="margin:0;font-size:13px;line-height:1.7;color:#667085;">
                                You can safely ignore this email. Your password will remain unchanged.
                              </p>
                            </div>

                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td align="center" style="background-color:#F8FAFC;padding:20px 24px;border-top:1px solid #E5E7EB;">
                            <p style="margin:0 0 6px;font-size:12px;color:#667085;">
                              FiRxt | Powered by WellAI
                            </p>
                            <p style="margin:0;font-size:11px;line-height:1.6;color:#98A2B3;">
                              This is an automated security email. Please do not reply to this message.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
          textContent: [
            "FiRxt — Password Reset",
            "",
            `Hello ${user.name || "there"},`,
            "",
            "We received a request to reset the password associated with your FiRxt account.",
            "",
            "Reset your password using this link:",
            resetUrl.toString(),
            "",
            "This link expires in 15 minutes and can only be used once.",
            "",
            "If you did not request a password reset, you can safely ignore this email.",
            "Your password will remain unchanged.",
            "",
            "FiRxt | Powered by WellAI",
          ].join("\n"),
        }),
        cache: "no-store",
      }
    );

    if (!brevoResponse.ok) {
      console.error(
        "Brevo email request failed with status:",
        brevoResponse.status
      );

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json(
        { error: "Unable to send the reset email right now." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message:
        "If an account exists for that email, a password-reset link will be sent.",
    });
  } catch (error) {
    console.error("Forgot-password request failed:", error);

    return NextResponse.json(
      { error: "Unable to process the request right now." },
      { status: 500 }
    );
  }
}
