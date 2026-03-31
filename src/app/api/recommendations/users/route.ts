import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    // Followers of People We Follow
    const results = await runQuery(
      `MATCH (me:User {id: $userId})-[:FOLLOWS]->(following:User)<-[:FOLLOWS]-(rec:User)
       WHERE rec.id <> $userId
         AND NOT (me)-[:FOLLOWS]->(rec)
         AND NOT (me)-[:BLOCKED]->(rec)
       RETURN rec, COUNT(following) AS sharedFollowing
       ORDER BY sharedFollowing DESC LIMIT 10`,
      { userId }
    );

    const users = results.map((r) => {
      const u = r.rec as Record<string, unknown>;
      delete u.password;
      return { ...u, sharedFollowing: r.sharedFollowing };
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
