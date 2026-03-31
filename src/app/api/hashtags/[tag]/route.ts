import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tag: string }> }) {
  try {
    const { tag } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 10;

    const results = await runQuery(
      `MATCH (author:User)-[:CREATED]->(p:Post)-[:HAS_TAG]->(h:Hashtag {name: toLower($tag)})
       WHERE p.visibility = 'public'
       OPTIONAL MATCH (p)<-[r:REACTED]-()
       RETURN p, author, COUNT(r) AS reactCount
       ORDER BY p.createdAt DESC
       SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { tag, cursor, limit }
    );

    const posts = results.map((r) => {
      const author = r.author as Record<string, unknown>;
      delete author.password;
      return {
        ...(r.p as Record<string, unknown>),
        author,
        likesCount: r.reactCount,
        images: (r.p as Record<string, unknown>).images || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: posts,
      nextCursor: posts.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error('Hashtag feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
