import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 12;

    const results = await runQuery(
      `MATCH (g:Group)
       OPTIONAL MATCH (g)<-[:MEMBER_OF]-(m:User)
       OPTIONAL MATCH (me:User {id: $userId})-[myMember:MEMBER_OF]->(g)
       RETURN g, COUNT(DISTINCT m) AS memberCount, myMember IS NOT NULL AS isMember
       ORDER BY memberCount DESC
       SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { userId: userId || '', cursor, limit }
    );

    const groups = results.map((r) => ({
      ...(r.g as Record<string, unknown>),
      memberCount: r.memberCount,
      isMember: r.isMember,
    }));

    return NextResponse.json({
      success: true,
      data: groups,
      nextCursor: groups.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: groups.length === limit,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { name, description, coverImage, privacy } = await req.json();
    if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

    const groupId = uuidv4();

    await runWriteQuery(
      `MATCH (u:User {id: $userId})
       CREATE (g:Group {
         id: $groupId,
         name: $name,
         description: $description,
         coverImage: $coverImage,
         privacy: $privacy,
         createdAt: datetime()
       })
       CREATE (u)-[:MEMBER_OF {role: 'admin', joinedAt: datetime()}]->(g)`,
      {
        userId,
        groupId,
        name,
        description: description || '',
        coverImage: coverImage || '',
        privacy: privacy || 'public',
      }
    );

    return NextResponse.json({ success: true, data: { id: groupId } }, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
