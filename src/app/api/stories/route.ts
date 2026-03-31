import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, deleteFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    // Lazy cleanup: Delete expired stories
    const expired = await runQuery(
      `MATCH (s:Story) WHERE s.expiresAt < datetime() RETURN s.mediaUrl AS url`
    );
    for (const r of (expired as Record<string, any>[])) {
      if (r.url) await deleteFile(r.url);
    }
    await runWriteQuery(`MATCH (s:Story) WHERE s.expiresAt < datetime() DETACH DELETE s`);

    // Get stories from followed users + own stories + public users' stories
    // Fixed: Parentheses around OR conditions to fix precedence bug
    // Also added public story support so all users can see public users' stories
    const results = await runQuery(
      `MATCH (author:User)-[:CREATED]->(s:Story)
       WHERE s.createdAt >= datetime() - duration('P1D')
         AND (
           author.id = $userId
           OR s.visibility = 'public'
           OR (
             (:User {id: $userId})-[:FOLLOWS]->(author)
             AND (author)-[:FOLLOWS]->(:User {id: $userId})
             AND (s.visibility = 'private' OR s.visibility IS NULL)
           )
         )
       OPTIONAL MATCH (me:User {id: $userId})-[v:VIEWED]->(s)
       RETURN s, author, v IS NOT NULL AS isViewed
       ORDER BY author.id, s.createdAt DESC`,
      { userId }
    );

    // Group stories by user
    const storyGroups = new Map<string, { user: Record<string, unknown>; stories: Record<string, unknown>[]; hasUnviewed: boolean }>();

    for (const r of results) {
      const story = r.s as Record<string, unknown>;
      const author = r.author as Record<string, unknown>;
      delete author.password;
      const authorId = author.id as string;

      if (!storyGroups.has(authorId)) {
        storyGroups.set(authorId, {
          user: author,
          stories: [],
          hasUnviewed: false,
        });
      }

      const group = storyGroups.get(authorId)!;
      group.stories.push({ ...story, isViewed: r.isViewed });
      if (!r.isViewed) group.hasUnviewed = true;
    }

    // Put current user's stories first, then unviewed, then viewed
    const groups = Array.from(storyGroups.values());
    groups.sort((a, b) => {
      const aIsSelf = (a.user.id as string) === userId;
      const bIsSelf = (b.user.id as string) === userId;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('Get stories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const contentType = req.headers.get('content-type') || '';
    let mediaUrl, mediaType, visibility;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      visibility = formData.get('visibility') as string;
      mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      mediaUrl = await uploadFile(file);
    } else {
      const body = await req.json();
      mediaUrl = body.mediaUrl;
      mediaType = body.mediaType;
      visibility = body.visibility;
    }

    if (!mediaUrl) return NextResponse.json({ error: 'Media is required' }, { status: 400 });

    const storyId = uuidv4();

    await runWriteQuery(
      `MATCH (u:User {id: $userId})
       CREATE (u)-[:CREATED]->(s:Story {
         id: $storyId,
         mediaUrl: $mediaUrl,
         mediaType: $mediaType,
         visibility: $visibility,
         isHighlighted: false,
         createdAt: datetime(),
         expiresAt: datetime() + duration('P1D')
       })`,
      { userId, storyId, mediaUrl, mediaType: mediaType || 'image', visibility: visibility || 'public' }
    );

    return NextResponse.json({ success: true, data: { id: storyId } }, { status: 201 });
  } catch (error) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
