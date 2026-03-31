import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import { getPusherServer, channels, events } from '@/lib/pusher';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 30;

    const results = await runQuery(
      `MATCH (sender:User)-[:SENT]->(m:Message)-[:IN]->(conv:Conversation {id: $convId})
       RETURN m, sender
       ORDER BY m.createdAt DESC
       SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { convId: id, cursor, limit }
    );

    const messages = results.map((r) => {
      const sender = r.sender as Record<string, unknown>;
      delete sender.password;
      return { ...(r.m as Record<string, unknown>), sender };
    }).reverse();

    return NextResponse.json({
      success: true,
      data: messages,
      nextCursor: messages.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: convId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { content, type, mediaUrl } = await req.json();
    if (!content && !mediaUrl) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const msgId = uuidv4();

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (conv:Conversation {id: $convId})
       CREATE (u)-[:SENT]->(m:Message {
         id: $msgId,
         content: $content,
         type: $type,
         mediaUrl: $mediaUrl,
         status: 'sent',
         deletedForMe: false,
         deletedForEveryone: false,
         createdAt: datetime()
       })-[:IN]->(conv)
       SET conv.updatedAt = datetime()`,
      { userId, convId, msgId, content: content || '', type: type || 'text', mediaUrl: mediaUrl || '' }
    );

    // Real-time message delivery
    const messageData = {
      id: msgId,
      content,
      type: type || 'text',
      mediaUrl: mediaUrl || '',
      sender: { id: userId, name: session.user.name, image: session.user.image },
      conversationId: convId,
      createdAt: new Date().toISOString(),
    };

    try {
      getPusherServer().trigger(channels.conversation(convId), events.NEW_MESSAGE, messageData);
    } catch { /* ignore pusher errors */ }

    return NextResponse.json({ success: true, data: messageData }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
