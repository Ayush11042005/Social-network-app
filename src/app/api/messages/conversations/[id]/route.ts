import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runSingleQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await runSingleQuery(
      `MATCH (conv:Conversation {id: $id})
       OPTIONAL MATCH (conv)<-[:PARTICIPANT_IN]-(p:User)
       RETURN conv, COLLECT({id: p.id, name: p.name, username: p.username, avatar: p.avatar}) AS participants`,
      { id }
    );

    if (!result) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: { ...(result.conv as Record<string, unknown>), participants: result.participants },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
