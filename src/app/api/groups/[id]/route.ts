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
      `MATCH (g:Group {id: $id})
       OPTIONAL MATCH (g)<-[:MEMBER_OF]-(m:User)
       OPTIONAL MATCH (creator:User)-[:MEMBER_OF {role: 'admin'}]->(g)
       OPTIONAL MATCH (me:User {id: $userId})-[myMember:MEMBER_OF]->(g)
       RETURN g, COUNT(DISTINCT m) AS memberCount, creator,
              myMember IS NOT NULL AS isMember, myMember.role AS myRole`,
      { id, userId: userId || '' }
    );

    if (!result) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const creator = result.creator as Record<string, unknown>;
    if (creator) delete creator.password;

    return NextResponse.json({
      success: true,
      data: {
        ...(result.g as Record<string, unknown>),
        memberCount: result.memberCount,
        creator,
        isMember: result.isMember,
        myRole: result.myRole,
      },
    });
  } catch (error) {
    console.error('Get group error:', error);
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
    const { name, description, coverImage, privacy } = body;

    await runWriteQuery(
      `MATCH (u:User {id: $userId})-[:MEMBER_OF {role: 'admin'}]->(g:Group {id: $id})
       SET g.name = COALESCE($name, g.name),
           g.description = COALESCE($description, g.description),
           g.coverImage = COALESCE($coverImage, g.coverImage),
           g.privacy = COALESCE($privacy, g.privacy)`,
      { id, userId, name, description, coverImage, privacy }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update group error:', error);
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
      `MATCH (u:User {id: $userId})-[:MEMBER_OF {role: 'admin'}]->(g:Group {id: $id})
       DETACH DELETE g`,
      { id, userId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
