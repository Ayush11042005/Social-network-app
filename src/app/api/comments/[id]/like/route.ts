import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (c:Comment {id: $commentId})
       MERGE (u)-[:LIKES {createdAt: datetime()}]->(c)`,
      { userId, commentId }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Like comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      'MATCH (u:User {id: $userId})-[r:LIKES]->(c:Comment {id: $commentId}) DELETE r',
      { userId, commentId }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlike comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
