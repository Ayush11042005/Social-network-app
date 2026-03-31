import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { type } = await req.json(); // like, love, haha, sad, angry

    // Remove existing reaction first, then add new one
    await runWriteQuery(
      'MATCH (u:User {id: $userId})-[r:REACTED]->(p:Post {id: $postId}) DELETE r',
      { userId, postId }
    );
    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (p:Post {id: $postId})
       CREATE (u)-[:REACTED {type: $type, createdAt: datetime()}]->(p)`,
      { userId, postId, type: type || 'like' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
