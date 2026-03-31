import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 10;

    const results = await runQuery(
      `MATCH (author:User)-[:CREATED]->(p:Post)-[:BELONGS_TO]->(g:Group {id: $groupId})
       OPTIONAL MATCH (p)<-[r:REACTED]-()
       OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
       RETURN p, author, COUNT(DISTINCT r) AS reactCount, myLike IS NOT NULL AS isLiked
       ORDER BY p.createdAt DESC
       SKIP toInteger($cursor) LIMIT toInteger($limit)`,
      { groupId, userId: userId || '', cursor, limit }
    );

    const posts = results.map((r) => {
      const author = r.author as Record<string, unknown>;
      delete author.password;
      return {
        ...(r.p as Record<string, unknown>),
        author,
        likesCount: r.reactCount,
        isLiked: r.isLiked,
        images: (r.p as Record<string, unknown>).images || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: posts,
      nextCursor: posts.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error('Get group posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { content, images, video } = await req.json();
    const postId = uuidv4();

    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (g:Group {id: $groupId})
       CREATE (u)-[:CREATED]->(p:Post {
         id: $postId,
         content: $content,
         images: $images,
         video: $video,
         location: '',
         visibility: 'public',
         createdAt: datetime(),
         updatedAt: datetime()
       })-[:BELONGS_TO]->(g)`,
      { userId, groupId, postId, content: content || '', images: images || [], video: video || '' }
    );

    return NextResponse.json({ success: true, data: { id: postId } }, { status: 201 });
  } catch (error) {
    console.error('Create group post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
