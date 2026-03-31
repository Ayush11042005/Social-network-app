import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const cursor = searchParams.get('cursor') || '0';
    const limit = 10;

    let cypher: string;
    const queryParams: Record<string, unknown> = { postId, cursor, limit, userId: userId || '' };

    if (parentId) {
      queryParams.parentId = parentId;
      cypher = `
        MATCH (author:User)-[:CREATED]->(c:Comment)-[:REPLY_TO]->(parent:Comment {id: $parentId})
        WHERE c.postId = $postId
        OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(c)
        OPTIONAL MATCH (c)<-[:REPLY_TO]-(reply:Comment)
        RETURN c, author, myLike IS NOT NULL AS isLiked, COUNT(DISTINCT reply) AS replyCount
        ORDER BY c.createdAt ASC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    } else {
      cypher = `
        MATCH (author:User)-[:CREATED]->(c:Comment {postId: $postId})
        WHERE NOT (c)-[:REPLY_TO]->(:Comment)
        OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(c)
        OPTIONAL MATCH (c)<-[:REPLY_TO]-(reply:Comment)
        RETURN c, author, myLike IS NOT NULL AS isLiked, COUNT(DISTINCT reply) AS replyCount
        ORDER BY c.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    }

    const results = await runQuery(cypher, queryParams);

    const comments = results.map((r) => {
      const comment = r.c as Record<string, unknown>;
      const author = r.author as Record<string, unknown>;
      delete author.password;
      return {
        ...comment,
        author,
        isLiked: r.isLiked,
        likesCount: 0,
        replyCount: r.replyCount,
        depth: parentId ? 1 : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: comments,
      nextCursor: comments.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: comments.length === limit,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { content, parentId } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const commentId = uuidv4();

    await runWriteQuery(
      `MATCH (u:User {id: $userId})
       CREATE (u)-[:CREATED]->(c:Comment {
         id: $commentId,
         content: $content,
         postId: $postId,
         createdAt: datetime(),
         updatedAt: datetime()
       })`,
      { userId, commentId, content, postId }
    );

    if (parentId) {
      await runWriteQuery(
        `MATCH (c:Comment {id: $commentId}), (parent:Comment {id: $parentId})
         CREATE (c)-[:REPLY_TO]->(parent)`,
        { commentId, parentId }
      );
    }

    // Create notification for post author
    await runWriteQuery(
      `MATCH (actor:User {id: $userId}), (author:User)-[:CREATED]->(p:Post {id: $postId})
       WHERE author.id <> $userId
       CREATE (n:Notification {
         id: randomUUID(),
         type: 'comment',
         message: actor.name + ' commented on your post',
         read: false,
         createdAt: datetime(),
         targetId: $postId,
         targetType: 'post'
       })
       CREATE (actor)-[:TRIGGERED]->(n)-[:FOR]->(author)`,
      { userId, postId }
    );

    return NextResponse.json({ success: true, data: { id: commentId } }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
