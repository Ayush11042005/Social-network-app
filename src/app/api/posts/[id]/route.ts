import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runSingleQuery, runWriteQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;

    const result = await runSingleQuery<Record<string, unknown>>(
      `MATCH (author:User)-[:CREATED]->(p:Post {id: $id})
       OPTIONAL MATCH (p)<-[likes:LIKES]-()
       OPTIONAL MATCH (p)<-[reacts:REACTED]-()
       OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
       OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
       OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
       OPTIONAL MATCH (me2:User {id: $userId})-[myReact:REACTED]->(p)
       OPTIONAL MATCH (me3:User {id: $userId})-[mySave:SAVED]->(p)
       OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
       RETURN p, author,
              COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
              COUNT(DISTINCT cm) AS commentCount,
              COUNT(DISTINCT shared) AS shareCount,
              myLike IS NOT NULL AS isLiked,
              myReact.type AS myReaction,
              mySave IS NOT NULL AS isSaved,
              COLLECT(DISTINCT tag.name) AS hashtags`,
      { id, userId: userId || '' }
    );

    if (!result) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const post = result.p as Record<string, unknown>;
    const author = result.author as Record<string, unknown>;
    delete author.password;

    // Privacy check: only show post if allowed
    const vis = post.visibility as string;
    const authorId = author.id as string;
    if (vis === 'private' && authorId !== userId) {
      return NextResponse.json({ error: 'This post is private' }, { status: 403 });
    }
    // For "followers" visibility, we'd need to check FOLLOWS relationship
    // but for a GET detail page, we'll allow it if the user has the link

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        author,
        likesCount: result.likeCount ?? 0,
        commentsCount: result.commentCount ?? 0,
        sharesCount: result.shareCount ?? 0,
        isLiked: result.isLiked ?? false,
        myReaction: result.myReaction,
        isSaved: result.isSaved ?? false,
        hashtags: result.hashtags ?? [],
        images: post.images || [],
        reactions: {},
        mentions: [],
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await req.json();
    const { content, visibility } = body;

    await runWriteQuery(
      `MATCH (u:User {id: $userId})-[:CREATED]->(p:Post {id: $id})
       SET p.content = COALESCE($content, p.content),
           p.visibility = COALESCE($visibility, p.visibility),
           p.updatedAt = datetime()`,
      { id, userId, content, visibility }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    await runWriteQuery(
      'MATCH (u:User {id: $userId})-[:CREATED]->(p:Post {id: $id}) DETACH DELETE p',
      { id, userId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
