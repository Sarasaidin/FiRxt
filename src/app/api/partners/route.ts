import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
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
      _count: {
        select: {
          products: true,
          services: true,
          reviews: true,
        },
      },
    },
  });

  // Calculate distances if geo provided
  const { haversineDistance } = await import("@/lib/utils");

  const withDistance = partners.map((partner) => ({
    ...partner,
    distanceMeters:
      !isNaN(lat) && !isNaN(lng)
        ? haversineDistance(lat, lng, partner.latitude, partner.longitude)
        : undefined,
  }));

  if (!isNaN(lat) && !isNaN(lng)) {
    withDistance.sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
    );
  }

  const total = await prisma.partner.count({ where });

  return NextResponse.json({
    partners: withDistance,
    total,
    page,
    limit,
  });
}

// POST: Register new partner
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if already logged in, adding partner to existing account
    const session = await getServerSession(authOptions);

    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Create new user
      if (!body.password) {
        return NextResponse.json(
          { error: "Password required" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
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
    const existing = await prisma.partner.findFirst({
      where: {
        userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already registered as partner" },
        { status: 409 }
      );
    }

    // Update user role to PARTNER
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: "PARTNER",
      },
    });

    const slug = slugify(body.businessName);
    const uniqueSlug = await makeUniqueSlug(slug);

    const partner = await prisma.partner.create({
      data: {
        userId,
        slug: uniqueSlug,
        name: body.businessName,
        type: body.type,
        email: body.email,
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

    await sendPartnerApprovalEmail({
      name: body.name,
      email: body.email,
      phone: body.phone,
      businessName: body.businessName,
      businessSsmNumber: body.businessSsmNumber,
      type: body.type,
      otherBusinessType: body.otherBusinessType,
      businessPhone: body.businessPhone,
      website: body.website,
      description: body.description,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postcode: body.postcode,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error: any) {
    console.error("[partner register]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

async function sendPartnerApprovalEmail(partner: {
  name: string;
  email: string;
  phone?: string;
  businessName: string;
  businessSsmNumber?: string;
  type: string;
  otherBusinessType?: string;
  businessPhone?: string;
  website?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "FiRxt <onboarding@resend.dev>";

  const businessType =
    partner.type === "OTHERS"
      ? partner.otherBusinessType || "Others"
      : partner.type;

  const fullAddress = [
    partner.addressLine1,
    partner.addressLine2,
    partner.city,
    partner.state,
    partner.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  if (!resendApiKey) {
    console.warn(
      "RESEND_API_KEY is missing. Partner approval email was not sent."
    );
    console.log("Partner application for approval:", partner);
    return;
  }

  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: "partner.approval@firxt.my",
    subject: `New FiRxt Partner Application - ${partner.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2a44; line-height: 1.6;">
        <h1 style="margin: 0 0 16px; font-size: 24px;">New Partner Application</h1>

        <h2 style="font-size: 18px; margin-top: 24px;">Applicant Details</h2>
        <p><strong>Name:</strong> ${partner.name}</p>
        <p><strong>Email:</strong> ${partner.email}</p>
        <p><strong>Phone:</strong> ${partner.phone || "-"}</p>

        <h2 style="font-size: 18px; margin-top: 24px;">Business Details</h2>
        <p><strong>Business Name:</strong> ${partner.businessName}</p>
        <p><strong>Business SSM Number:</strong> ${
          partner.businessSsmNumber || "-"
        }</p>
        <p><strong>Business Type:</strong> ${businessType}</p>
        <p><strong>Business Phone:</strong> ${partner.businessPhone || "-"}</p>
        <p><strong>Website:</strong> ${partner.website || "-"}</p>
        <p><strong>Description:</strong> ${partner.description || "-"}</p>

        <h2 style="font-size: 18px; margin-top: 24px;">Location</h2>
        <p><strong>Address:</strong> ${fullAddress || "-"}</p>
        <p><strong>Latitude:</strong> ${partner.latitude ?? "-"}</p>
        <p><strong>Longitude:</strong> ${partner.longitude ?? "-"}</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend partner approval email error:", error);
    console.log("Partner application for approval:", partner);
  }
}