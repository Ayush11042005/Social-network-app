import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '0';
    const limit = 10;
    const type = searchParams.get('type') || 'home';
    const targetId = searchParams.get('userId');

    let cypher = '';
    const params: Record<string, unknown> = { userId, cursor, limit, targetId };

    if (type === 'home') {
      cypher = `
        MATCH (me:User {id: $userId})
        OPTIONAL MATCH (me)-[:FOLLOWS]->(followed:User)
        WITH me, COLLECT(DISTINCT followed.id) AS followedIds
        MATCH (author:User)-[:CREATED]->(p:Post)
        WHERE (
          p.visibility = 'public'
          OR (
            (:User {id: $userId})-[:FOLLOWS]->(author)
            AND (author)-[:FOLLOWS]->(:User {id: $userId})
            AND (p.visibility = 'private' OR p.visibility IS NULL)
          )
          OR (author.id = $userId)
        )
        AND NOT (me)-[:BLOCKED]->(author) AND NOT (author)-[:BLOCKED]->(me)
        OPTIONAL MATCH (p)<-[likes:LIKES]-()
        OPTIONAL MATCH (p)<-[reacts:REACTED]-()
        OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
        OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
        OPTIONAL MATCH (me)-[myLike:LIKES]->(p)
        OPTIONAL MATCH (me)-[myReact:REACTED]->(p)
        OPTIONAL MATCH (me)-[mySave:SAVED]->(p)
        OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
        WITH p, author,
             COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
             COUNT(DISTINCT cm) AS commentCount,
             COUNT(DISTINCT shared) AS shareCount,
             myLike IS NOT NULL AS isLiked,
             myReact.type AS myReaction,
             mySave IS NOT NULL AS isSaved,
             COLLECT(DISTINCT tag.name) AS hashtags
        RETURN p, author, likeCount, commentCount, shareCount, isLiked, myReaction, isSaved, hashtags
        ORDER BY p.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    } else if (type === 'user') {
      // All posts created by targetUserId
      cypher = `
        MATCH (author:User {id: $targetId})-[:CREATED]->(p:Post)
        WHERE (p.visibility = 'public' OR author.id = $userId)
        OPTIONAL MATCH (p)<-[likes:LIKES]-()
        OPTIONAL MATCH (p)<-[reacts:REACTED]-()
        OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
        OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
        OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
        OPTIONAL MATCH (me)-[myReact:REACTED]->(p)
        OPTIONAL MATCH (me)-[mySave:SAVED]->(p)
        OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
        WITH p, author,
             COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
             COUNT(DISTINCT cm) AS commentCount,
             COUNT(DISTINCT shared) AS shareCount,
             myLike IS NOT NULL AS isLiked,
             myReact.type AS myReaction,
             mySave IS NOT NULL AS isSaved,
             COLLECT(DISTINCT tag.name) AS hashtags
        RETURN p, author, likeCount, commentCount, shareCount, isLiked, myReaction, isSaved, hashtags
        ORDER BY p.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    } else if (type === 'likes') {
      // Posts liked by THIS user (targetId must be self)
      if (targetId && targetId !== userId) {
        return NextResponse.json({ error: 'Private' }, { status: 403 });
      }
      cypher = `
        MATCH (me:User {id: $userId})-[l:LIKES]->(p:Post)
        MATCH (author:User)-[:CREATED]->(p)
        OPTIONAL MATCH (p)<-[likes:LIKES]-()
        OPTIONAL MATCH (p)<-[reacts:REACTED]-()
        OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
        OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
        OPTIONAL MATCH (me)-[myLike:LIKES]->(p)
        OPTIONAL MATCH (me)-[myReact:REACTED]->(p)
        OPTIONAL MATCH (me)-[mySave:SAVED]->(p)
        OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
        WITH p, author, l,
             COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
             COUNT(DISTINCT cm) AS commentCount,
             COUNT(DISTINCT shared) AS shareCount,
             myLike IS NOT NULL AS isLiked,
             myReact.type AS myReaction,
             mySave IS NOT NULL AS isSaved,
             COLLECT(DISTINCT tag.name) AS hashtags
        RETURN p, author, likeCount, commentCount, shareCount, isLiked, myReaction, isSaved, hashtags
        ORDER BY l.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    } else if (type === 'saved') {
      // Posts saved by THIS user (targetId must be self)
      if (targetId && targetId !== userId) {
        return NextResponse.json({ error: 'Private' }, { status: 403 });
      }
      cypher = `
        MATCH (me:User {id: $userId})-[s:SAVED]->(p:Post)
        MATCH (author:User)-[:CREATED]->(p)
        OPTIONAL MATCH (p)<-[likes:LIKES]-()
        OPTIONAL MATCH (p)<-[reacts:REACTED]-()
        OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
        OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
        OPTIONAL MATCH (me)-[myLike:LIKES]->(p)
        OPTIONAL MATCH (me)-[myReact:REACTED]->(p)
        OPTIONAL MATCH (me)-[mySave:SAVED]->(p)
        OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
        WITH p, author, s,
             COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
             COUNT(DISTINCT cm) AS commentCount,
             COUNT(DISTINCT shared) AS shareCount,
             myLike IS NOT NULL AS isLiked,
             myReact.type AS myReaction,
             mySave IS NOT NULL AS isSaved,
             COLLECT(DISTINCT tag.name) AS hashtags
        RETURN p, author, likeCount, commentCount, shareCount, isLiked, myReaction, isSaved, hashtags
        ORDER BY s.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    } else {
      // Explore: trending public posts
      cypher = `
        MATCH (author:User)-[:CREATED]->(p:Post)
        WHERE p.visibility = 'public'
        OPTIONAL MATCH (p)<-[likes:LIKES]-()
        OPTIONAL MATCH (p)<-[reacts:REACTED]-()
        OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
        OPTIONAL MATCH (p)<-[:SHARED_POST]-(shared:Post)
        OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
        OPTIONAL MATCH (me2:User {id: $userId})-[myReact:REACTED]->(p)
        OPTIONAL MATCH (me3:User {id: $userId})-[mySave:SAVED]->(p)
        OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
        WITH p, author,
             COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
             COUNT(DISTINCT cm) AS commentCount,
             COUNT(DISTINCT shared) AS shareCount,
             myLike IS NOT NULL AS isLiked,
             myReact.type AS myReaction,
             mySave IS NOT NULL AS isSaved,
             COLLECT(DISTINCT tag.name) AS hashtags
        RETURN p, author, likeCount, commentCount, shareCount, isLiked, myReaction, isSaved, hashtags
        ORDER BY likeCount DESC, p.createdAt DESC
        SKIP toInteger($cursor) LIMIT toInteger($limit)`;
    }

    const results = await runQuery(cypher, params);

    const posts = results.map((r) => {
      const post = r.p as Record<string, unknown>;
      const authorData = r.author as Record<string, unknown>;
      delete authorData.password;
      return {
        ...post,
        author: authorData,
        likesCount: r.likeCount ?? 0,
        commentsCount: r.commentCount ?? 0,
        sharesCount: r.shareCount ?? 0,
        isLiked: r.isLiked ?? false,
        myReaction: r.myReaction,
        isSaved: r.isSaved ?? false,
        hashtags: r.hashtags ?? [],
        reactions: {},
        mentions: [],
        images: post.images || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: posts,
      nextCursor: posts.length === limit ? String(Number(cursor) + limit) : undefined,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const contentType = req.headers.get('content-type') || '';
    console.log('--- POST /api/posts DEBUG ---');
    console.log('Content-Type:', contentType);

    let content, images, video, location, visibility, hashtags, mentions, groupId;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      console.log('FormData received');
      content = formData.get('content') as string;
      visibility = (formData.get('visibility') as string) || 'public';
      location = formData.get('location') as string;
      hashtags = JSON.parse((formData.get('hashtags') as string) || '[]');
      mentions = JSON.parse((formData.get('mentions') as string) || '[]');
      groupId = formData.get('groupId') as string;

      // Process file uploads
      const imageFiles = formData.getAll('images') as File[];
      const videoFile = formData.get('video') as File | null;
      console.log('Image files count:', imageFiles.length);

      images = await Promise.all(imageFiles.map((file) => {
        console.log('Uploading file:', file.name, 'size:', file.size);
        return uploadFile(file);
      }));
      video = videoFile && videoFile.size > 0 ? await uploadFile(videoFile) : null;
      if (video) console.log('Video uploaded:', video);
    } else {
      console.log('JSON body received');
      const body = await req.json();
      content = body.content;
      images = body.images;
      video = body.video;
      location = body.location;
      visibility = body.visibility;
      hashtags = body.hashtags;
      mentions = body.mentions;
      groupId = body.groupId;
    }

    if (!content && (!images || images.length === 0) && !video) {
      return NextResponse.json({ error: 'Post must have content or media' }, { status: 400 });
    }

    const postId = uuidv4();

    // Create post
    await runWriteQuery(
      `MATCH (u:User {id: $userId})
       CREATE (u)-[:CREATED]->(p:Post {
         id: $postId,
         content: $content,
         images: $images,
         video: $video,
         location: $location,
         visibility: $visibility,
         createdAt: datetime(),
         updatedAt: datetime()
       })`,
      {
        userId,
        postId,
        content: content || '',
        images: images || [],
        video: video || '',
        location: location || '',
        visibility: visibility || 'public',
      }
    );

    // Create hashtag relationships
    if (hashtags && hashtags.length > 0) {
      for (const tag of hashtags) {
        await runWriteQuery(
          `MATCH (p:Post {id: $postId})
           MERGE (h:Hashtag {name: toLower($tag)})
           ON CREATE SET h.createdAt = datetime()
           MERGE (p)-[:HAS_TAG]->(h)`,
          { postId, tag }
        );
      }
    }

    // Group assignment
    if (groupId) {
      await runWriteQuery(
        `MATCH (p:Post {id: $postId}), (g:Group {id: $groupId})
         CREATE (p)-[:BELONGS_TO]->(g)`,
        { postId, groupId }
      );
    }

    // Mention notifications
    if (mentions && mentions.length > 0) {
      for (const username of mentions) {
        await runWriteQuery(
          `MATCH (actor:User {id: $userId}), (target:User {username: $username})
           CREATE (n:Notification {
             id: randomUUID(),
             type: 'mention',
             message: actor.name + ' mentioned you in a post',
             read: false,
             createdAt: datetime(),
             targetId: $postId,
             targetType: 'post'
           })
           CREATE (actor)-[:TRIGGERED]->(n)-[:FOR]->(target)`,
          { userId, username, postId }
        );
      }
    }

    return NextResponse.json({ success: true, data: { id: postId } }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
