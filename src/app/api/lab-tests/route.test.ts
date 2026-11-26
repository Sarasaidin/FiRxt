
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  labTestFindMany: vi.fn(),
  labTestCreate: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    labTest: {
      findMany: mocks.labTestFindMany,
      create: mocks.labTestCreate,
    },
  },
}));

import { GET, POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/lab-tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Lab tests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "admin_test_1",
        role: "ADMIN",
      },
    });

    mocks.labTestFindMany.mockResolvedValue([]);
    mocks.labTestCreate.mockResolvedValue({
      id: "lab_test_1",
      code: "FBC",
      name: "Full Blood Count",
      description: null,
      category: "Haematology",
      isActive: true,
    });
  });

  describe("GET /api/lab-tests", () => {
    it("returns active laboratory tests", async () => {
      mocks.labTestFindMany.mockResolvedValue([
        {
          id: "lab_test_1",
          code: "FBC",
          name: "Full Blood Count",
          isActive: true,
        },
      ]);

      const response = await GET(
        new Request("http://localhost/api/lab-tests")
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toHaveProperty("labTests");

      expect(mocks.labTestFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [
          { category: "asc" },
          { name: "asc" },
        ],
      });
    });

        it("returns active and inactive tests for an administrator", async () => {
      mocks.labTestFindMany.mockResolvedValue([
        {
          id: "lab_test_1",
          code: "FBC",
          name: "Full Blood Count",
          isActive: true,
        },
        {
          id: "lab_test_2",
          code: "LFT",
          name: "Liver Function Test",
          isActive: false,
        },
      ]);

      const response = await GET(
        new Request(
          "http://localhost/api/lab-tests?includeInactive=true"
        )
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.labTests).toHaveLength(2);

      expect(mocks.labTestFindMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [
          { category: "asc" },
          { name: "asc" },
        ],
      });
    });

    it("rejects unauthenticated requests for inactive tests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await GET(
        new Request(
          "http://localhost/api/lab-tests?includeInactive=true"
        )
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestFindMany).not.toHaveBeenCalled();
    });

    it("rejects non-administrator requests for inactive tests", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: {
          id: "partner_test_1",
          role: "PARTNER",
        },
      });

      const response = await GET(
        new Request(
          "http://localhost/api/lab-tests?includeInactive=true"
        )
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestFindMany).not.toHaveBeenCalled();
    });

    it("returns 500 when database retrieval fails", async () => {
      mocks.labTestFindMany.mockRejectedValue(
        new Error("Database unavailable")
      );

      const response = await GET(
        new Request("http://localhost/api/lab-tests")
      );

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/lab-tests", () => {
    it("creates a laboratory test for an administrator", async () => {
      const response = await POST(
        makeRequest({
          code: " fbc ",
          name: " Full Blood Count ",
          category: "Haematology",
        })
      );

      expect(response.status).toBe(201);

      expect(mocks.labTestCreate).toHaveBeenCalledWith({
        data: {
          code: "FBC",
          name: "Full Blood Count",
          description: null,
          category: "Haematology",
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await POST(
        makeRequest({
          code: "FBC",
          name: "Full Blood Count",
        })
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestCreate).not.toHaveBeenCalled();
    });

    it("rejects non-administrator requests", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: {
          id: "partner_test_1",
          role: "PARTNER",
        },
      });

      const response = await POST(
        makeRequest({
          code: "FBC",
          name: "Full Blood Count",
        })
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestCreate).not.toHaveBeenCalled();
    });

    it("rejects invalid laboratory test details", async () => {
      const response = await POST(
        makeRequest({
          code: "!",
          name: "A",
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.labTestCreate).not.toHaveBeenCalled();
    });

    it("rejects unsupported request fields", async () => {
      const response = await POST(
        makeRequest({
          code: "FBC",
          name: "Full Blood Count",
          isActive: false,
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.labTestCreate).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed JSON", async () => {
      const request = new Request(
        "http://localhost/api/lab-tests",
        {
          method: "POST",
          body: "{invalid-json",
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mocks.labTestCreate).not.toHaveBeenCalled();
    });

    it("returns 409 when the laboratory test code already exists", async () => {
      mocks.labTestCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          {
            code: "P2002",
            clientVersion: "6.19.3",
          }
        )
      );

      const response = await POST(
        makeRequest({
          code: "FBC",
          name: "Full Blood Count",
        })
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A laboratory test with this code already exists.",
      });
    });
  });
});
