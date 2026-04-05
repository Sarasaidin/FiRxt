import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET all approved partners (with optional geo filtering)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const type = searchParams.get("type");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: any = { status: "APPROVED" };
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      city: true,
      state: true,
      addressLine1: true,
      addressLine2: true,
      logoUrl: true,
      bannerUrl: true,
      isVerified: true,
      latitude: true,
      longitude: true,
      phone: true,
      email: true,
      operatingHours: true,
      tags: true,
      _count: { select: { products: true, services: true, reviews: true } },
    },
  });

  // Calculate distances if geo provided
  const { haversineDistance } = await import("@/lib/utils");
  const withDistance = partners.map((p) => ({
    ...p,
    distanceMeters:
      !isNaN(lat) && !isNaN(lng)
        ? haversineDistance(lat, lng, p.latitude, p.longitude)
        : undefined,
  }));

  if (!isNaN(lat) && !isNaN(lng)) {
    withDistance.sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
    );
  }

  const total = await prisma.partner.count({ where });

  return NextResponse.json({ partners: withDistance, total, page, limit });
}

// POST: Register new partner
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if already logged in (adding partner to existing account)
    const session = await getServerSession(authOptions);

    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Create new user
      if (!body.password) {
        return NextResponse.json({ error: "Password required" }, { status: 400 });
      }
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          passwordHash,
          role: "PARTNER",
        },
      });
      userId = user.id;
    }

    // Check if user already has a partner
    const existing = await prisma.partner.findFirst({ where: { userId } });
    if (existing) {
      return NextResponse.json({ error: "Already registered as partner" }, { status: 409 });
    }

    // Update user role to PARTNER
    await prisma.user.update({
      where: { id: userId },
      data: { role: "PARTNER" },
    });

    const slug = slugify(body.businessName);
    const uniqueSlug = await makeUniqueSlug(slug);

    const partner = await prisma.partner.create({
      data: {
        userId,
        slug: uniqueSlug,
        name: body.businessName,
        type: body.type,
        email: body.businessEmail ?? body.email,
        phone: body.businessPhone ?? body.phone,
        website: body.website ?? null,
        description: body.description ?? null,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 ?? null,
        city: body.city,
        state: body.state,
        postcode: body.postcode,
        latitude: body.latitude,
        longitude: body.longitude,
        status: "PENDING",
      },
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error: any) {
    console.error("[partner register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function makeUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (await prisma.partner.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
