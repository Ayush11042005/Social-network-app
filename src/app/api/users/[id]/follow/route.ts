import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery, runSingleQuery } from '@/lib/neo4j';
import { getPusherServer, channels, events } from '@/lib/pusher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    if (userId === targetId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    await runWriteQuery(
      `MATCH (a:User {id: $userId}), (b:User {id: $targetId})
       MERGE (a)-[:FOLLOWS {createdAt: datetime()}]->(b)`,
      { userId, targetId }
    );

    // Create notification
    await runWriteQuery(
      `MATCH (actor:User {id: $userId})
       CREATE (n:Notification {
         id: randomUUID(),
         type: 'follow',
         message: actor.name + ' started following you',
         read: false,
         createdAt: datetime(),
         targetId: $userId,
         targetType: 'user'
       })
       WITH n, actor
       MATCH (target:User {id: $targetId})
       CREATE (actor)-[:TRIGGERED]->(n)-[:FOR]->(target)`,
      { userId, targetId }
    );

    // Real-time notification
    try {
      const actor = await runSingleQuery<{ u: Record<string, unknown> }>(
        'MATCH (u:User {id: $userId}) RETURN u', { userId }
      );
      getPusherServer().trigger(channels.notifications(targetId), events.NEW_NOTIFICATION, {
        type: 'follow',
        actor: actor?.u,
      });
    } catch { /* ignore pusher errors */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
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
      'MATCH (a:User {id: $userId})-[r:FOLLOWS]->(b:User {id: $targetId}) DELETE r',
      { userId, targetId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
