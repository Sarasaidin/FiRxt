
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  packageFindMany: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bloodTestPackage: {
      findMany: mocks.packageFindMany,
    },
  },
}));

import { GET } from "./route";

function mockAuthenticatedAdmin() {
  mocks.getServerSession.mockResolvedValue({
    user: {
      id: "admin_test_1",
      role: "ADMIN",
    },
  });
}

describe("Admin blood-test packages listing API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockAuthenticatedAdmin();
    mocks.packageFindMany.mockResolvedValue([]);
  });

  it("returns pending packages for administrators", async () => {
    mocks.packageFindMany.mockResolvedValue([
      {
        id: "package_test_1",
        name: "Complete Blood Test",
        approvalStatus: "PENDING",
        isActive: true,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.packages).toHaveLength(1);
    expect(data.packages[0].name).toBe("Complete Blood Test");

    expect(mocks.packageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          approvalStatus: "PENDING",
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
    );

    expect(mocks.packageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          ownerPartner: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              status: true,
            },
          },
          packageTests: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              labTest: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  isActive: true,
                },
              },
            },
          },
        },
      })
    );
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.packageFindMany).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "user_test_1",
        role: "CUSTOMER",
      },
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.packageFindMany).not.toHaveBeenCalled();
  });

  it("returns 500 when package retrieval fails", async () => {
    mocks.packageFindMany.mockRejectedValue(
      new Error("Database unavailable")
    );

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
