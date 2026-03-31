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

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (p:Post {id: $postId})
       MERGE (u)-[:LIKES {createdAt: datetime()}]->(p)`,
      { userId, postId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      'MATCH (u:User {id: $userId})-[r:LIKES]->(p:Post {id: $postId}) DELETE r',
      { userId, postId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlike error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
