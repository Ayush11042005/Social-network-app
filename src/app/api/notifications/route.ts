import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 20;

    const results = await runQuery(
      `MATCH (actor:User)-[:TRIGGERED]->(n:Notification)-[:FOR]->(me:User {id: $userId})
       WHERE n.type = 'follow'
       OPTIONAL MATCH (me)-[f:FOLLOWS]->(actor)
       RETURN n, actor, f IS NOT NULL AS isFollowingBack
       ORDER BY n.createdAt DESC
       SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { userId, cursor, limit }
    );

    const notifications = results.map((r) => {
      const actor = r.actor as Record<string, unknown>;
      delete actor.password;
      return {
        ...(r.n as Record<string, unknown>),
        actor,
        isFollowingBack: r.isFollowingBack ?? false,
      };
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      nextCursor: notifications.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
