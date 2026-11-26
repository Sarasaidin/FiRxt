import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  existingPartnerRegisterSchema,
  partnerRegisterSchema,
} from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { PartnerType, Prisma } from "@prisma/client";

// GET all approved partners (with optional geo filtering)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");

  const lat = rawLat === null ? NaN : Number(rawLat);
  const lng = rawLng === null ? NaN : Number(rawLng);

  const hasValidCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  const rawType = searchParams.get("type");
  const search = searchParams.get("q")?.trim();

  const requestedPage = Number(searchParams.get("page") ?? "1");
  const requestedLimit = Number(searchParams.get("limit") ?? "20");

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 20;

  if (
    rawType &&
    !Object.values(PartnerType).includes(rawType as PartnerType)
  ) {
    return NextResponse.json(
      { error: "Invalid business type." },
      { status: 400 }
    );
  }

  const type = rawType as PartnerType | null;

  const where: Prisma.PartnerWhereInput = {
    status: "APPROVED",
  };

  if (type) where.type = type;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  try {

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
        hasValidCoordinates &&
        partner.latitude !== null &&
        partner.longitude !== null
          ? haversineDistance(
              lat,
              lng,
              partner.latitude,
              partner.longitude
            )
          : undefined,
    }));


    if (hasValidCoordinates) {
      withDistance.sort((a, b) => {
        if (a.distanceMeters === undefined) return 1;
        if (b.distanceMeters === undefined) return -1;

        return a.distanceMeters - b.distanceMeters;
      });
    }


    const total = await prisma.partner.count({ where });

    return NextResponse.json({
      partners: withDistance,
      total,
      page,
      limit,
    });

    } catch (error) {
      console.error("[partners GET]", error);

      return NextResponse.json(
        { error: "Unable to retrieve partners at this time." },
        { status: 500 }
      );
    }
  }


// POST: Register a new business under a new or existing account
export async function POST(req: Request) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please submit valid JSON." },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const requestBody = body as Record<string, unknown>;

    const session = await getServerSession(authOptions);

    const isExistingUser = Boolean(session?.user?.id);

    // Existing accounts do not need to submit account creation fields.
    const validationSchema = isExistingUser
      ? existingPartnerRegisterSchema
      : partnerRegisterSchema;

    const validation = validationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Please correct the registration details.",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const email = data.email.trim().toLowerCase();

    const name = isExistingUser
      ? session?.user?.name?.trim() ?? ""
      : typeof requestBody.name === "string"
        ? requestBody.name.trim()
        : "";

    const password =
      !isExistingUser && typeof requestBody.password === "string"
        ? requestBody.password
        : undefined;

    const applicantPhone =
      !isExistingUser && typeof requestBody.phone === "string"
        ? requestBody.phone
        : undefined;

    const businessName = data.businessName.trim();
    const businessSsmNumber = data.businessSsmNumber.trim();
    const type = data.type;


    // Existing accounts must submit their authenticated account email.
    if (
      isExistingUser &&
      session?.user?.email?.trim().toLowerCase() !== email
    ) {
      return NextResponse.json(
        { error: "The submitted email does not match your account." },
        { status: 403 }
      );
    }

    // Do not create another account for an existing email.
    if (!isExistingUser) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              "This email is already registered. Please sign in to add another business.",
          },
          { status: 409 }
        );
      }
    }

    // Resolve the corresponding BusinessType.
    const businessType = await prisma.businessType.findUnique({
      where: { code: type },
    });

    if (!businessType || !businessType.isActive) {
      return NextResponse.json(
        { error: "This business type is currently unavailable." },
        { status: 400 }
      );
    }

    // Check duplicate SSM registration number.
    const existingRegistration =
      await prisma.partner.findUnique({
        where: {
          businessRegistrationNumber: businessSsmNumber,
        },
        select: { id: true },
      });

    if (existingRegistration) {
      return NextResponse.json(
        {
          error:
            "This SSM registration number is already registered.",
        },
        { status: 409 }
      );
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : undefined;

    const slug = slugify(businessName);

    if (!slug) {
      return NextResponse.json(
        { error: "Please provide a valid business name." },
        { status: 400 }
      );
    }

    const uniqueSlug = await makeUniqueSlug(slug);

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      let account;

      if (isExistingUser) {
        // Verify the authenticated account directly from the database.
        account = await tx.user.findUnique({
          where: { id: session!.user.id },
        });

        if (
          !account ||
          account.email.trim().toLowerCase() !== email ||
          !account.emailVerified
        ) {
          throw new Error("ACCOUNT_EMAIL_NOT_VERIFIED");
        }

        // Preserve ADMIN privileges.
        if (account.role !== "ADMIN" && account.role !== "PARTNER") {
          account = await tx.user.update({
            where: { id: account.id },
            data: { role: "PARTNER" },
          });
        }
      } else {
        // Verify and consume the new user's email verification.
        const verification =
          await tx.emailVerification.findUnique({
            where: { email },
          });

        if (
          !verification ||
          !verification.verifiedAt ||
          verification.consumedAt ||
          verification.expiresAt <= now
        ) {
          throw new Error("EMAIL_VERIFICATION_REQUIRED");
        }

        const consumed = await tx.emailVerification.updateMany({
          where: {
            id: verification.id,
            email,
            verifiedAt: verification.verifiedAt,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });

        if (consumed.count !== 1) {
          throw new Error("EMAIL_VERIFICATION_REQUIRED");
        }

        account = await tx.user.create({
          data: {
            name,
            email,
            phone: applicantPhone,
            passwordHash: passwordHash!,
            role: "PARTNER",
            emailVerified: verification.verifiedAt,
          },
        });
      }

      // Create the new business under the selected account.
      const partner = await tx.partner.create({
        data: {
          userId: account.id,
          slug: uniqueSlug,
          name: businessName,
          businessTypeId: businessType.id,
          businessRegistrationNumber: businessSsmNumber,
          type,
          email,
          phone: data.businessPhone,
          website: data.website || null,
          description: data.description || null,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          city: data.city,
          state: data.state,
          postcode: data.postcode,
          latitude: data.latitude,
          longitude: data.longitude,
          status: "PENDING",
        },
      });

      return { account, partner };
    });

    // Send approval email only after the transaction succeeds.
    try {
      await sendPartnerApprovalEmail({
        name: result.account.name ?? name,
        email,
        phone: result.account.phone ?? applicantPhone,
        businessName,
        businessSsmNumber,
        type,
        businessPhone: data.businessPhone,
        website: data.website,
        description: data.description,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (emailError) {
      console.error("[partner approval email]", emailError);
    }

    return NextResponse.json(
      { partner: result.partner },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_VERIFICATION_REQUIRED"
    ) {
      return NextResponse.json(
        { error: "Please verify your email before registering." },
        { status: 403 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "ACCOUNT_EMAIL_NOT_VERIFIED"
    ) {
      return NextResponse.json(
        { error: "Please verify your account email before registering a business." },
        { status: 403 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const target =
        "meta" in error &&
        typeof error.meta === "object" &&
        error.meta !== null &&
        "target" in error.meta
          ? error.meta.target
          : undefined;

      if (
        Array.isArray(target) &&
        target.includes("businessRegistrationNumber")
      ) {
        return NextResponse.json(
          {
            error: "This SSM registration number is already registered.",
          },
          { status: 409 }
        );
      }

      if (Array.isArray(target) && target.includes("slug")) {
        return NextResponse.json(
          {
            error:
              "This business URL is already in use. Please try again.",
          },
          { status: 409 }
        );
      }

      if (Array.isArray(target) && target.includes("email")) {
        return NextResponse.json(
          {
            error: "This email address is already registered.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "A duplicate record was detected." },
        { status: 409 }
      );
    }

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
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
  latitude?: number | null;
  longitude?: number | null;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "FiRxt <onboarding@resend.dev>";

  const businessType = partner.type;

  const fullAddress = [
    partner.addressLine1,
    partner.addressLine2,
    partner.city,
    partner.state,
    partner.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  const safe = (value?: string | null) =>
    escapeHtml(value || "-");

  const safeBusinessType = safe(businessType);
  const safeFullAddress = safe(fullAddress);

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
        <p><strong>Name:</strong> ${safe(partner.name)}</p>
        <p><strong>Email:</strong> ${safe(partner.email)}</p>
        <p><strong>Phone:</strong> ${safe(partner.phone)}</p>

        <h2 style="font-size: 18px; margin-top: 24px;">Business Details</h2>
        <p><strong>Business Name:</strong> ${safe(partner.businessName)}</p>
        <p><strong>Business SSM Number:</strong> ${safe(partner.businessSsmNumber)}</p>
        <p><strong>Business Type:</strong> ${safeBusinessType}</p>
        <p><strong>Business Phone:</strong> ${safe(partner.businessPhone)}</p>
        <p><strong>Website:</strong> ${safe(partner.website)}</p>
        <p><strong>Description:</strong> ${safe(partner.description)}</p>

        <h2 style="font-size: 18px; margin-top: 24px;">Location</h2>
        <p><strong>Address:</strong> ${safeFullAddress}</p>
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