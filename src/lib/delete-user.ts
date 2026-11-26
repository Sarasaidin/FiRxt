
import { prisma } from "@/lib/prisma";

export async function deleteEligibleUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      _count: {
        select: {
          orders: true,
        },
      },
      partners: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return { ok: false as const, status: 404, error: "User not found." };
  }

  if (user.role !== "CUSTOMER") {
    return {
      ok: false as const,
      status: 400,
      error: "Only customer accounts can be deleted using this feature.",
    };
  }

  if (user._count.orders > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "This account has order history and cannot be deleted through this feature.",
    };
  }

  if (user.partners.length > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "This account has one or more partner profiles and cannot be deleted through this feature.",
    };
  }

  await prisma.$transaction(async (tx) => {
    // Remove records that have restrictive User relationships.
    await tx.review.deleteMany({ where: { userId } });
    await tx.behaviorLog.deleteMany({ where: { userId } });

    // These models use userId without a Prisma relation to User.
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.emailVerification.deleteMany({
      where: { email: user.email },
    });

    // Addresses, sessions and accounts have cascading User relations,
    // so they will be removed when the User record is deleted.
    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true as const };
}
