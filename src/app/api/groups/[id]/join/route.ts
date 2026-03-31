import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (g:Group {id: $groupId})
       MERGE (u)-[:MEMBER_OF {role: 'member', joinedAt: datetime()}]->(g)`,
      { userId, groupId }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      'MATCH (u:User {id: $userId})-[r:MEMBER_OF]->(g:Group {id: $groupId}) DELETE r',
      { userId, groupId }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
