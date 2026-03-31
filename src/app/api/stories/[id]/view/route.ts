import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storyId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (s:Story {id: $storyId})
       MERGE (u)-[:VIEWED {viewedAt: datetime()}]->(s)`,
      { userId, storyId }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
