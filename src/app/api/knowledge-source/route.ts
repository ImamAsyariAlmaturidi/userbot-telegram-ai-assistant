import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { cookies } from "next/headers";
import {
  generateEmbedding,
  embeddingToVectorString,
} from "@/lib/ai/embeddings";

const prisma = new PrismaClient();

// GET all knowledge sources for a user
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const telegram_user_id = searchParams.get("telegram_user_id");

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

    // Get all knowledge sources
    const knowledgeSources = await prisma.knowledgeSource.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      knowledgeSources,
    });
  } catch (error: any) {
    console.error("Error fetching knowledge sources:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch knowledge sources" },
      { status: 500 }
    );
  }
}

// POST create new knowledge source
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id, content } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
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

    // Generate embeddings for content
    console.log(
      `[API] Generating embeddings for knowledge source (content length: ${
        content.trim().length
      })`
    );
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content.trim());
      console.log(
        `[API] Generated embedding with ${embedding.length} dimensions`
      );
    } catch (embeddingError: any) {
      console.error("[API] Error generating embedding:", embeddingError);
      // Don't fail the request if embedding generation fails
      // Return error but allow user to retry
      return NextResponse.json(
        {
          error:
            embeddingError.message ||
            "Failed to generate embeddings. Please check OPENAI_API_KEY.",
        },
        { status: 500 }
      );
    }

    // Generate ID for knowledge source
    const id = crypto.randomUUID();

    // Save embeddings to database using raw SQL (because Prisma doesn't support vector type directly)
    try {
      const vectorString = embeddingToVectorString(embedding);

      console.log(
        `[API] Saving embeddings to database (vector string length: ${vectorString.length})`
      );

      // Use raw SQL to insert with vector type
      // Format: INSERT INTO table (col1, col2, vector_col) VALUES ($1, $2, $3::vector)
      // The vector string format '[0.1,0.2,0.3]' is accepted by pgvector
      // Note: Prisma's $executeRaw template literal doesn't support casting, so we use $executeRawUnsafe
      await prisma.$executeRawUnsafe(
        `INSERT INTO "knowledge_source" ("id", "content", "embeddings", "metadata", "created_at", "updated_at")
         VALUES ($1::text, $2::text, $3::vector, NULL::jsonb, NOW(), NOW())`,
        id,
        content.trim(),
        vectorString
      );

      // Fetch the created knowledge source
      const knowledgeSource = await prisma.knowledgeSource.findUnique({
        where: { id },
        select: {
          id: true,
          content: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!knowledgeSource) {
        throw new Error("Failed to retrieve created knowledge source");
      }

      console.log(
        `[API] Created knowledge source ${knowledgeSource.id} with embeddings for telegram_user_id: ${userId}`
      );

      return NextResponse.json({
        success: true,
        knowledgeSource,
      });
    } catch (dbError: any) {
      console.error(
        "[API] Error saving knowledge source to database:",
        dbError
      );
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error creating knowledge source:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create knowledge source" },
      { status: 500 }
    );
  }
}
