
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  labTestUpdate: vi.fn(),
  labTestUpdateMany: vi.fn(),
  labTestFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    labTest: {
      update: mocks.labTestUpdate,
      updateMany: mocks.labTestUpdateMany,
      findUnique: mocks.labTestFindUnique,
    },
  },
}));

import { PATCH, PUT, DELETE } from "./route";

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/lab-tests/lab_test_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = {
  params: Promise.resolve({ id: "lab_test_1" }),
};

describe("Individual lab tests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "admin_test_1",
        role: "ADMIN",
      },
    });

    mocks.labTestUpdate.mockResolvedValue({
      id: "lab_test_1",
      code: "FBC",
      name: "Full Blood Count",
      isActive: true,
    });

    mocks.labTestUpdateMany.mockResolvedValue({ count: 1 });

    mocks.labTestFindUnique.mockResolvedValue({
      id: "lab_test_1",
      isActive: true,
    });
  });

  describe("PATCH /api/lab-tests/[id]", () => {
    it("updates a laboratory test", async () => {
      const response = await PATCH(
        makeRequest({
          name: " Complete Blood Count ",
        }),
        context
      );

      expect(response.status).toBe(200);

      expect(mocks.labTestUpdate).toHaveBeenCalledWith({
        where: { id: "lab_test_1" },
        data: {
          name: "Complete Blood Count",
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await PATCH(
        makeRequest({ name: "Updated Test" }),
        context
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestUpdate).not.toHaveBeenCalled();
    });

    it("rejects non-administrator requests", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: {
          id: "partner_test_1",
          role: "PARTNER",
        },
      });

      const response = await PATCH(
        makeRequest({ name: "Updated Test" }),
        context
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestUpdate).not.toHaveBeenCalled();
    });

    it("rejects empty update requests", async () => {
      const response = await PATCH(
        makeRequest({}),
        context
      );

      expect(response.status).toBe(400);
      expect(mocks.labTestUpdate).not.toHaveBeenCalled();
    });

    it("rejects unsupported fields", async () => {
      const response = await PATCH(
        makeRequest({
          name: "Updated Test",
          isActive: false,
        }),
        context
      );

      expect(response.status).toBe(400);
      expect(mocks.labTestUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed JSON", async () => {
      const request = new Request(
        "http://localhost/api/lab-tests/lab_test_1",
        {
          method: "PATCH",
          body: "{invalid-json",
        }
      );

      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      expect(mocks.labTestUpdate).not.toHaveBeenCalled();
    });
  });

    describe("PUT /api/lab-tests/[id]", () => {
    it("reactivates an inactive laboratory test", async () => {
      mocks.labTestUpdateMany.mockResolvedValue({ count: 1 });

      const response = await PUT(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(200);

      expect(mocks.labTestUpdateMany).toHaveBeenCalledWith({
        where: {
          id: "lab_test_1",
          isActive: false,
        },
        data: {
          isActive: true,
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await PUT(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the test does not exist", async () => {
      mocks.labTestUpdateMany.mockResolvedValue({ count: 0 });
      mocks.labTestFindUnique.mockResolvedValue(null);

      const response = await PUT(
        new Request("http://localhost/api/lab-tests/unknown"),
        context
      );

      expect(response.status).toBe(404);
    });

    it("returns 409 when the test is already active", async () => {
      mocks.labTestUpdateMany.mockResolvedValue({ count: 0 });
      mocks.labTestFindUnique.mockResolvedValue({
        id: "lab_test_1",
        isActive: true,
      });

      const response = await PUT(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(409);
    });
  });

  describe("DELETE /api/lab-tests/[id]", () => {
    it("soft-deactivates a laboratory test", async () => {
      const response = await DELETE(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(200);

      expect(mocks.labTestUpdateMany).toHaveBeenCalledWith({
        where: {
          id: "lab_test_1",
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await DELETE(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(403);
      expect(mocks.labTestUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the test does not exist", async () => {
      mocks.labTestUpdateMany.mockResolvedValue({ count: 0 });
      mocks.labTestFindUnique.mockResolvedValue(null);

      const response = await DELETE(
        new Request("http://localhost/api/lab-tests/unknown"),
        context
      );

      expect(response.status).toBe(404);
    });

    it("returns 409 when the test is already inactive", async () => {
      mocks.labTestUpdateMany.mockResolvedValue({ count: 0 });
      mocks.labTestFindUnique.mockResolvedValue({
        id: "lab_test_1",
        isActive: false,
      });

      const response = await DELETE(
        new Request("http://localhost/api/lab-tests/lab_test_1"),
        context
      );

      expect(response.status).toBe(409);
    });
  });
});
