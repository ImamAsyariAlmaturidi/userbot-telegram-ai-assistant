import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

// DELETE knowledge source
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { telegram_user_id } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    const userId = BigInt(parseInt(telegram_user_id, 10));

    // Get session from cookie (required)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session is required. Please login first." },
        { status: 401 }
      );
    }

    // Verify user exists and session matches
    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { id: true, session: true },
    });

    if (!user || user.session !== sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if knowledge source exists
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!knowledgeSource) {
      return NextResponse.json(
        { error: "Knowledge source not found" },
        { status: 404 }
      );
    }

    // Delete knowledge source
    await prisma.knowledgeSource.delete({
      where: { id },
    });

    console.log(
      `[API] Deleted knowledge source ${id} for telegram_user_id: ${userId}`
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error deleting knowledge source:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete knowledge source" },
      { status: 500 }
    );
  }
}
