import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as "approve" | "reject";
  const reason = body.reason as string | undefined;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const partner = await prisma.partner.update({
    where: { id },
    data:
      action === "approve"
        ? {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: session.user.id,
            rejectedReason: null,
          }
        : {
            status: "REJECTED",
            rejectedReason: reason ?? "Does not meet requirements",
          },
  });

  return NextResponse.json({ partner });
}
