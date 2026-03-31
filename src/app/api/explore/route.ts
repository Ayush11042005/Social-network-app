import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'trending'; // trending, hashtags, people, recent

    // Optional auth (for isFollowing on people tab)
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;

    if (type === 'hashtags') {
      const tags = await runQuery(
        `MATCH (h:Hashtag)<-[:HAS_TAG]-(p:Post)
         WHERE p.visibility = 'public'
         RETURN h.name AS name, COUNT(p) AS postCount
         ORDER BY postCount DESC LIMIT 25`,
        {}
      );
      return NextResponse.json({
        success: true,
        data: tags.map((r) => ({ name: r.name, postCount: r.postCount })),
      });
    }

    if (type === 'people') {
      // Return popular users with follower counts (excludes self)
      const people = await runQuery(
        `MATCH (u:User)
         WHERE ($userId IS NULL OR u.id <> $userId)
         OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
         OPTIONAL MATCH (u)-[:CREATED]->(p:Post)
         WITH u, COUNT(DISTINCT follower) AS followerCount, COUNT(DISTINCT p) AS postCount
         ORDER BY followerCount DESC, postCount DESC
         LIMIT 20
         OPTIONAL MATCH (me:User {id: $userId})-[f:FOLLOWS]->(u)
         RETURN u, followerCount, postCount, f IS NOT NULL AS isFollowing`,
        { userId: userId || null }
      );

      return NextResponse.json({
        success: true,
        data: people.map((r) => {
          const u = r.u as Record<string, unknown>;
          delete u.password;
          return {
            ...u,
            followerCount: r.followerCount ?? 0,
            postCount: r.postCount ?? 0,
            isFollowing: r.isFollowing ?? false,
          };
        }),
      });
    }

    if (type === 'recent') {
      // Most recent public posts
      const results = await runQuery(
        `MATCH (author:User)-[:CREATED]->(p:Post)
         WHERE p.visibility = 'public'
         OPTIONAL MATCH (p)<-[likes:LIKES]-()
         OPTIONAL MATCH (p)<-[reacts:REACTED]-()
         OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
         OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
         OPTIONAL MATCH (me2:User {id: $userId})-[myReact:REACTED]->(p)
         OPTIONAL MATCH (me3:User {id: $userId})-[mySave:SAVED]->(p)
         OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
         WITH p, author,
              COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
              COUNT(DISTINCT cm) AS commentCount,
              myLike IS NOT NULL AS isLiked,
              myReact.type AS myReaction,
              mySave IS NOT NULL AS isSaved,
              COLLECT(DISTINCT tag.name) AS hashtags
         RETURN p, author, likeCount, commentCount, isLiked, myReaction, isSaved, hashtags
         ORDER BY p.createdAt DESC LIMIT 30`,
        { userId: userId || '' }
      );

      const posts = results.map((r) => {
        const author = r.author as Record<string, unknown>;
        delete author.password;
        const post = r.p as Record<string, unknown>;
        return {
          ...post,
          author,
          likesCount: r.likeCount ?? 0,
          commentsCount: r.commentCount ?? 0,
          sharesCount: 0,
          isLiked: r.isLiked ?? false,
          myReaction: r.myReaction,
          isSaved: r.isSaved ?? false,
          hashtags: r.hashtags ?? [],
          images: post.images || [],
          reactions: {},
          mentions: [],
        };
      });

      return NextResponse.json({ success: true, data: posts });
    }

    if (type === 'tagged') {
      // Posts that have at least one hashtag
      const results = await runQuery(
        `MATCH (author:User)-[:CREATED]->(p:Post)-[:HAS_TAG]->(tag:Hashtag)
         WHERE p.visibility = 'public'
         OPTIONAL MATCH (p)<-[likes:LIKES]-()
         OPTIONAL MATCH (p)<-[reacts:REACTED]-()
         OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
         OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
         OPTIONAL MATCH (me2:User {id: $userId})-[myReact:REACTED]->(p)
         OPTIONAL MATCH (me3:User {id: $userId})-[mySave:SAVED]->(p)
         WITH p, author,
              COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
              COUNT(DISTINCT cm) AS commentCount,
              myLike IS NOT NULL AS isLiked,
              myReact.type AS myReaction,
              mySave IS NOT NULL AS isSaved,
              COLLECT(DISTINCT tag.name) AS hashtags
         RETURN DISTINCT p, author, likeCount, commentCount, isLiked, myReaction, isSaved, hashtags
         ORDER BY p.createdAt DESC LIMIT 30`,
        { userId: userId || '' }
      );

      const posts = results.map((r) => {
        const author = r.author as Record<string, unknown>;
        delete author.password;
        const post = r.p as Record<string, unknown>;
        return {
          ...post,
          author,
          likesCount: r.likeCount ?? 0,
          commentsCount: r.commentCount ?? 0,
          sharesCount: 0,
          isLiked: r.isLiked ?? false,
          myReaction: r.myReaction,
          isSaved: r.isSaved ?? false,
          hashtags: r.hashtags ?? [],
          images: post.images || [],
          reactions: {},
          mentions: [],
        };
      });

      return NextResponse.json({ success: true, data: posts });
    }

    // Default: Trending posts (most likes + comments)
    const results = await runQuery(
      `MATCH (author:User)-[:CREATED]->(p:Post)
       WHERE p.visibility = 'public'
       OPTIONAL MATCH (p)<-[likes:LIKES]-()
       OPTIONAL MATCH (p)<-[reacts:REACTED]-()
       OPTIONAL MATCH (p)<-[:CREATED]-(cm:Comment)
       OPTIONAL MATCH (me:User {id: $userId})-[myLike:LIKES]->(p)
       OPTIONAL MATCH (me2:User {id: $userId})-[myReact:REACTED]->(p)
       OPTIONAL MATCH (me3:User {id: $userId})-[mySave:SAVED]->(p)
       OPTIONAL MATCH (p)-[:HAS_TAG]->(tag:Hashtag)
       WITH p, author,
            COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) AS likeCount,
            COUNT(DISTINCT cm) AS commentCount,
            myLike IS NOT NULL AS isLiked,
            myReact.type AS myReaction,
            mySave IS NOT NULL AS isSaved,
            COLLECT(DISTINCT tag.name) AS hashtags,
            (COUNT(DISTINCT likes) + COUNT(DISTINCT reacts) * 2 + COUNT(DISTINCT cm) * 3) AS engagement
       WHERE engagement > 0
       RETURN p, author, likeCount, commentCount, isLiked, myReaction, isSaved, hashtags, engagement
       ORDER BY likeCount DESC, engagement DESC, p.createdAt DESC
       LIMIT 30`,
      { userId: userId || '' }
    );

    const posts = results.map((r) => {
      const author = r.author as Record<string, unknown>;
      delete author.password;
      const post = r.p as Record<string, unknown>;
      return {
        ...post,
        author,
        likesCount: r.likeCount ?? 0,
        commentsCount: r.commentCount ?? 0,
        sharesCount: 0,
        isLiked: r.isLiked ?? false,
        myReaction: r.myReaction,
        isSaved: r.isSaved ?? false,
        hashtags: r.hashtags ?? [],
        images: post.images || [],
        reactions: {},
        mentions: [],
      };
    });

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Explore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
