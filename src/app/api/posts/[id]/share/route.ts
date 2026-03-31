import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWriteQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { caption } = await req.json();
    const shareId = uuidv4();

    // Create a new post that references the original
    await runWriteQuery(
      `MATCH (u:User {id: $userId}), (original:Post {id: $postId})
       CREATE (u)-[:CREATED]->(share:Post {
         id: $shareId,
         content: $caption,
         images: [],
         video: '',
         location: '',
         visibility: 'public',
         sharedPostId: $postId,
         createdAt: datetime(),
         updatedAt: datetime()
       })`,
      { userId, postId, shareId, caption: caption || '' }
    );

    return NextResponse.json({ success: true, data: { id: shareId } }, { status: 201 });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
