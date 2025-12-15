import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // PASTIKAN pakai prisma singleton
import { cookies } from "next/headers";
import { checkAuthStatus } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Next.js 16: params adalah Promise

    // Safely parse JSON (DELETE sometimes has no body!)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const telegram_user_id = body.telegram_user_id;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    const userId = BigInt(telegram_user_id);

    // Get session from Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    let sessionString = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionString = authHeader.split(" ")[1];
    } else {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("tg_session");
      sessionString = sessionCookie?.value ?? "";
    }

    if (!sessionString) {
      return NextResponse.json(
        { error: "Session is required. Please login first." },
        { status: 401 }
      );
    }

    // Verify session is valid using the auth utility
    const { isAuthorized } = await checkAuthStatus(sessionString);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Session expired or invalid. Please login again." },
        { status: 401 }
      );
    }

    await prisma.knowledgeSource.delete({
      where: { id },
    });

    console.log(`[API] Deleted knowledge source ${id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /knowledge-source error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Knowledge source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
