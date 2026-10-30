
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  verificationFindUnique: vi.fn(),
  verificationUpdateMany: vi.fn(),
  transaction: vi.fn(),
  passwordHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.passwordHash,
  },
}));

import { POST } from "./route";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: "NewUser@example.com",
      phone: "0123456789",
      password: "SecurePassword123!",
      ...overrides,
    }),
  });
}

function makeVerification(overrides: Record<string, unknown> = {}) {
  return {
    id: "verification_test_1",
    email: "newuser@example.com",
    verifiedAt: new Date(Date.now() - 60_000),
    consumedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60_000),
    ...overrides,
  };
}

describe("Registration POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.userFindUnique.mockResolvedValue(null);
    mocks.passwordHash.mockResolvedValue("hashed_password");

    mocks.verificationFindUnique.mockResolvedValue(makeVerification());
    mocks.verificationUpdateMany.mockResolvedValue({ count: 1 });

    mocks.userCreate.mockResolvedValue({
      id: "user_test_1",
      email: "newuser@example.com",
      name: "Test User",
      role: "CUSTOMER",
    });

    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          emailVerification: {
            findUnique: mocks.verificationFindUnique,
            updateMany: mocks.verificationUpdateMany,
          },
          user: {
            create: mocks.userCreate,
          },
        }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects registration when the email has not been verified", async () => {
    mocks.verificationFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Please verify your email before creating an account.",
    });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects registration when verification has expired", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({
        expiresAt: new Date(Date.now() - 1_000),
      }),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects registration when verification was already consumed", async () => {
    mocks.verificationFindUnique.mockResolvedValue(
      makeVerification({ consumedAt: new Date() }),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects registration when another request has consumed verification", async () => {
    mocks.verificationUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects an email that is already registered", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "existing_user" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("creates an account after successful email verification", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      user: {
        id: "user_test_1",
        email: "newuser@example.com",
        name: "Test User",
        role: "CUSTOMER",
      },
    });

    expect(mocks.passwordHash).toHaveBeenCalledWith(
      "SecurePassword123!",
      12,
    );
    expect(mocks.verificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: "newuser@example.com",
          consumedAt: null,
        }),
        data: { consumedAt: expect.any(Date) },
      }),
    );
    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "newuser@example.com",
          passwordHash: "hashed_password",
          role: "CUSTOMER",
        }),
      }),
    );
  });

  it("normalizes the email address before checking registration", async () => {
    await POST(makeRequest());

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "newuser@example.com" },
      select: { id: true },
    });
  });
});
