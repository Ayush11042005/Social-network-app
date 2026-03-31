import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const results = await runQuery(
      `MATCH (me:User {id: $userId})-[:PARTICIPATES_IN]->(c:Conversation)
       OPTIONAL MATCH (c)<-[:PARTICIPATES_IN]-(other:User) WHERE other.id <> $userId
       OPTIONAL MATCH (msg:Message)-[:IN_CONVERSATION]->(c)
       
       WITH c, other, msg
       ORDER BY msg.createdAt DESC
       
       // Group by conversation
       WITH c, COLLECT(DISTINCT other) as participants, COLLECT(msg)[0] as lastMessage
       
       // Count unread (messages not created by me, and not marked as read by me)
       OPTIONAL MATCH (unread:Message)-[:IN_CONVERSATION]->(c)
       WHERE unread.senderId <> $userId AND NOT (:User {id: $userId})-[:READ]->(unread)
       WITH c, participants, lastMessage, COUNT(DISTINCT unread) AS unreadCount
       
       RETURN c, participants, lastMessage, unreadCount
       ORDER BY lastMessage.createdAt DESC`,
      { userId }
    );

    const conversations = results.map((r) => {
      const conv = r.c as Record<string, unknown>;
      const participants = r.participants as Record<string, unknown>[];
      const safeParticipants = participants.map((p) => {
        const { password, ...safeUser } = p;
        return safeUser;
      });

      return {
        ...conv,
        participants: safeParticipants,
        lastMessage: r.lastMessage,
        unreadCount: r.unreadCount || 0,
      };
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { targetUserId } = await req.json();
    if (!targetUserId || targetUserId === userId) {
      return NextResponse.json({ error: 'Invalid target user' }, { status: 400 });
    }

    // Check if conversation already exists between these two users
    const existing = await runQuery(
      `MATCH (u1:User {id: $userId})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(u2:User {id: $targetUserId})
       WHERE NOT c.isGroup OR c.isGroup IS NULL
       RETURN c LIMIT 1`,
      { userId, targetUserId }
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: { id: (existing[0].c as Record<string, unknown>).id },
      });
    }

    // Create new conversation
    const convId = uuidv4();
    await runWriteQuery(
      `MATCH (u1:User {id: $userId}), (u2:User {id: $targetUserId})
       CREATE (c:Conversation {id: $convId, createdAt: datetime(), isGroup: false})
       CREATE (u1)-[:PARTICIPATES_IN]->(c)
       CREATE (u2)-[:PARTICIPATES_IN]->(c)`,
      { userId, targetUserId, convId }
    );

    return NextResponse.json({ success: true, data: { id: convId } }, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
