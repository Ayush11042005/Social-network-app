import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      `MATCH (a:User {id: $userId}), (b:User {id: $targetId})
       MERGE (a)-[:BLOCKED {createdAt: datetime()}]->(b)`,
      { userId, targetId }
    );

    // Also unfollow in both directions
    await runWriteQuery(
      `MATCH (a:User {id: $userId})-[r:FOLLOWS]->(b:User {id: $targetId}) DELETE r`,
      { userId, targetId }
    );
    await runWriteQuery(
      `MATCH (a:User {id: $targetId})-[r:FOLLOWS]->(b:User {id: $userId}) DELETE r`,
      { userId, targetId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      'MATCH (a:User {id: $userId})-[r:BLOCKED]->(b:User {id: $targetId}) DELETE r',
      { userId, targetId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unblock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
