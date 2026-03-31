import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await runQuery(
      `MATCH (u:User)
       WHERE toLower(u.name) CONTAINS toLower($q)
          OR toLower(u.username) CONTAINS toLower($q)
       RETURN u LIMIT 20`,
      { q }
    );

    const users = results.map((r) => {
      const u = r.u as Record<string, unknown>;
      delete u.password;
      return u;
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
