import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware untuk static files dan API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Public routes yang tidak perlu auth
  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Root path - biarkan Next.js handle (page.tsx akan redirect)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Middleware tidak lagi cek cookie karena menggunakan localStorage
  // Biarkan client-side (dashboard/page.tsx) yang handle redirect berdasarkan localStorage session
  // Dashboard akan check localStorage session dan redirect ke login jika tidak ada/tidak valid

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
