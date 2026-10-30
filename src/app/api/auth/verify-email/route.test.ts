import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  verificationFindUnique: vi.fn(),
  verificationUpsert: vi.fn(),
  verificationUpdateMany: vi.fn(),
  verificationDeleteMany: vi.fn(),
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    emailVerification: {
      findUnique: mocks.verificationFindUnique,
      upsert: mocks.verificationUpsert,
      updateMany: mocks.verificationUpdateMany,
      deleteMany: mocks.verificationDeleteMany,
    },
  },
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function makeVerification(overrides: Record<string, unknown> = {}) {
  return {
    id: "verification_test_1",
    email: "newuser@example.com",
    codeHash: hashCode("123456"),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    verifiedAt: null,
    consumedAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Email verification POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("BREVO_SMTP_HOST", "smtp-relay.brevo.com");
    vi.stubEnv("BREVO_SMTP_PORT", "587");
    vi.stubEnv("BREVO_SMTP_LOGIN", "test-smtp-login");
    vi.stubEnv("BREVO_SMTP_KEY", "test-smtp-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "test@example.com");

    mocks.userFindUnique.mockResolvedValue(null);
    mocks.verificationFindUnique.mockResolvedValue(null);
    mocks.verificationUpsert.mockResolvedValue({});
    mocks.verificationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.verificationDeleteMany.mockResolvedValue({ count: 1 });
    mocks.sendMail.mockResolvedValue({
      messageId: "email_test_1",
    });
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid email address", async () => {
    const response = await POST(
      makeRequest({
        email: "not-an-email",
        action: "send",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("sends a verification code for a new email", async () => {
    const response = await POST(
      makeRequest({
        email: " NewUser@Example.com ",
        action: "send",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Verification code sent successfully.",
    });

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "newuser@example.com" },
      select: { id: true },
    });

    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "test-smtp-login",
        pass: "test-smtp-key",
      },
    });

    expect(mocks.verificationUpsert).toHaveBeenCalledOnce();
    expect(mocks.sendMail).toHaveBeenCalledOnce();

    const saved = mocks.verificationUpsert.mock.calls[0][0];

    expect(saved.create.email).toBe("newuser@example.com");
    expect(saved.create.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.create.codeHash).not.toBe("123456");
    expect(saved.create.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const emailOptions = mocks.sendMail.mock.calls[0][0];

    expect(emailOptions.to).toBe("newuser@example.com");
    expect(emailOptions.from).toBe("test@example.com");
    expect(emailOptions.subject).toBe(
      "Your FiRxt account verification code",
    );
    expect(emailOptions.html).toContain("Verify your email");
    expect(emailOptions.html).toContain("10 minutes");
  });

  it("rejects sending a code to an existing user", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "existing_user" });

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "send",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.verificationUpsert).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("enforces the resend cooldown", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({ createdAt: new Date() }),
    );

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "send",
      }),
    );

    expect(response.status).toBe(429);
    expect(mocks.verificationUpsert).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns an error and removes the new verification record when SMTP sending fails", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP connection failed"));

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "send",
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to send the verification email. Please try again.",
    });

    expect(mocks.verificationUpsert).toHaveBeenCalledOnce();
    expect(mocks.verificationDeleteMany).toHaveBeenCalledWith({
      where: {
        email: "newuser@example.com",
        codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        verifiedAt: null,
        consumedAt: null,
      },
    });
  });

  it("returns 503 when Brevo SMTP configuration is missing", async () => {
    vi.stubEnv("BREVO_SMTP_KEY", "");

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "send",
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it("rejects an incorrect verification code and increments attempts", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({ codeHash: hashCode("654321") }),
    );

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "verify",
        code: "123456",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid verification code.",
    });

    expect(mocks.verificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "verification_test_1",
          attempts: { lt: 5 },
        }),
        data: { attempts: { increment: 1 } },
      }),
    );
  });

  it("rejects an expired verification code", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({
        expiresAt: new Date(Date.now() - 1000),
      }),
    );

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "verify",
        code: "123456",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Verification code has expired. Please request a new one.",
    });

    expect(mocks.verificationDeleteMany).toHaveBeenCalledOnce();
    expect(mocks.verificationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects verification after five failed attempts", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({ attempts: 5 }),
    );

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "verify",
        code: "123456",
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many attempts. Please request a new code.",
    });

    expect(mocks.verificationUpdateMany).not.toHaveBeenCalled();
  });

  it("marks a valid verification code as verified", async () => {
    mocks.verificationFindUnique.mockResolvedValue(makeVerification());

    const response = await POST(
      makeRequest({
        email: "newuser@example.com",
        action: "verify",
        code: "123456",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Email verified successfully.",
    });

    expect(mocks.verificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "verification_test_1",
          codeHash: hashCode("123456"),
          verifiedAt: null,
          consumedAt: null,
        }),
        data: { verifiedAt: expect.any(Date) },
      }),
    );
  });
});
