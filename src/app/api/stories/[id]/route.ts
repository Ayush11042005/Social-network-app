import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery, runWriteQuery } from '@/lib/neo4j';
import { deleteFile } from '@/lib/storage';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storyId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    // Check ownership and get media URL
    const results = await runQuery(
      `MATCH (u:User {id: $userId})-[:CREATED]->(s:Story {id: $storyId})
       RETURN s.mediaUrl AS url`,
      { userId, storyId }
    );

    if (results.length === 0) {
      return NextResponse.json({ error: 'Story not found or unauthorized' }, { status: 404 });
    }

    const { url } = results[0] as { url: string };
    
    // Cleanup filesystem
    if (url) await deleteFile(url);

    // Delete from DB
    await runWriteQuery(
      `MATCH (s:Story {id: $storyId}) DETACH DELETE s`,
      { storyId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
