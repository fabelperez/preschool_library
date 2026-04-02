import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 501 }
    );
  }

  try {
    const { query, categoryId, resourceCategoryId } = await request.json();

    // Quick availability check — no DB hit needed
    if (query === "_ping") {
      return NextResponse.json({ available: true });
    }

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Fetch all items to rank
    const bookWhere: Record<string, unknown> = {};
    if (categoryId) bookWhere.categoryId = categoryId;
    if (resourceCategoryId) bookWhere.resource = { resourceCategoryId };

    const resourceWhere: Record<string, unknown> = {};
    if (resourceCategoryId) resourceWhere.resourceCategoryId = resourceCategoryId;

    const [books, resources] = await Promise.all([
      prisma.book.findMany({
        where: bookWhere,
        include: {
          category: true,
          qualifier: true,
          resource: { include: { resourceCategory: true, checkouts: { where: { returnedAt: null } } } },
          checkouts: { where: { returnedAt: null }, include: { teacher: true } },
        },
      }),
      categoryId && !resourceCategoryId
        ? Promise.resolve([])
        : prisma.resource.findMany({
            where: resourceWhere,
            include: {
              resourceCategory: true,
              checkouts: { where: { returnedAt: null }, include: { teacher: true } },
            },
          }),
    ]);

    // Build descriptions for LLM ranking
    const items = [
      ...books.map((b) => ({
        id: b.id,
        type: "book" as const,
        description: `Book: "${b.title}" by ${b.author}. Category: ${b.category?.name || "none"}. ${b.resource ? `Theme: ${b.resource.resourceCategory?.name || "none"}. Teacher resource.` : ""}`,
      })),
      ...resources.map((r) => ({
        id: r.id,
        type: "resource" as const,
        description: `Teacher Resource Material: "${r.name}". ${r.description || ""}. Theme: ${r.resourceCategory?.name || "none"}.`,
      })),
    ];

    if (items.length === 0) {
      return NextResponse.json({ rankedIds: [] });
    }

    // Ask LLM to rank items by relevance
    const itemList = items
      .map((item, i) => `${i}. ${item.description}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You rank library items by relevance to a search query. Return ONLY a JSON array of index numbers ordered by relevance (most relevant first). Include only items with some relevance. Example: [3,0,7]",
          },
          {
            role: "user",
            content: `Search query: "${query.trim()}"\n\nItems:\n${itemList}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenAI error:", errBody);
      return NextResponse.json(
        { error: "LLM ranking failed" },
        { status: 502 }
      );
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content?.trim() || "[]";

    let rankedIndices: number[];
    try {
      // Extract JSON array from response (handles markdown code blocks)
      const jsonMatch = content.match(/\[[\d,\s]*\]/);
      rankedIndices = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse LLM response:", content);
      rankedIndices = [];
    }

    const rankedIds = rankedIndices
      .filter((i) => i >= 0 && i < items.length)
      .map((i) => ({ id: items[i].id, type: items[i].type }));

    return NextResponse.json({ rankedIds });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Semantic search failed";
    console.error("Semantic search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
