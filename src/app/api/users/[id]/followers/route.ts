import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 20;

    const results = await runQuery(
      `MATCH (u:User {id: $id})<-[:FOLLOWS]-(f:User)
       RETURN f ORDER BY f.name SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { id, cursor, limit }
    );

    const followers = results.map((r) => {
      const u = r.f as Record<string, unknown>;
      delete u.password;
      return u;
    });

    return NextResponse.json({
      success: true,
      data: followers,
      nextCursor: followers.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: followers.length === limit,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
