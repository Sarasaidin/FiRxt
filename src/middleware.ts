import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect /partner-dashboard routes
  if (pathname.startsWith("/partner-dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "PARTNER" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (token.role === "PARTNER" && token.partnerStatus !== "APPROVED") {
      return NextResponse.redirect(new URL("/partner-pending", req.url));
    }
  }

  // Protect customer routes
  if (
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/profile")
  ) {
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner-dashboard/:path*",
    "/cart",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile",
  ],
};
