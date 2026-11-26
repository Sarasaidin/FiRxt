
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_PARTNER_COOKIE } from "@/lib/active-partner";
import { getPartnerContext } from "@/lib/active-partner";

export async function GET() {
  try {
    const partnerContext = await getPartnerContext();

    if (!partnerContext) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!partnerContext.activePartner) {
      return NextResponse.json(
        { error: "No active business selected." },
        { status: 404 }
      );
    }

    const partner = await prisma.partner.findFirst({
      where: {
        id: partnerContext.activePartner.id,
        userId: partnerContext.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        bannerUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postcode: true,
        latitude: true,
        longitude: true,
        operatingHours: true,
        tags: true,
        status: true,
      },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Business not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ partner });
  } catch (error) {
    console.error("[active partner retrieval]", error);

    return NextResponse.json(
      { error: "Unable to retrieve the active business." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: unknown = await req.json().catch(() => null);

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("partnerId" in body) ||
      typeof body.partnerId !== "string" ||
      !body.partnerId.trim()
    ) {
      return NextResponse.json(
        { error: "A valid business ID is required." },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findFirst({
      where: {
        id: body.partnerId.trim(),
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Business not found or access denied." },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(ACTIVE_PARTNER_COOKIE, partner.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      message: "Active business updated.",
      partner,
    });
  } catch (error) {
    console.error("[active partner selection]", error);

    return NextResponse.json(
      { error: "Unable to select this business." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.delete(ACTIVE_PARTNER_COOKIE);

    return NextResponse.json({
      message: "Active business selection cleared.",
    });
  } catch (error) {
    console.error("[active partner reset]", error);

    return NextResponse.json(
      { error: "Unable to clear the active business." },
      { status: 500 }
    );
  }
}
