import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      NEO4J_URI: process.env.NEO4J_URI ? '✅ Found' : '❌ Missing',
      NEO4J_USERNAME: process.env.NEO4J_USERNAME ? '✅ Found' : '❌ Missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Found' : '❌ Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ Found' : '❌ Missing',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Found' : '❌ Missing',
      PUSHER_APP_ID: process.env.PUSHER_APP_ID ? '✅ Found' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
      NETLIFY: process.env.NETLIFY ? 'Yes' : 'No',
    },
    database: {
      status: 'Checking...',
      error: null as string | null,
    },
  };

  try {
    const start = Date.now();
    await runQuery('RETURN 1 AS test');
    diagnostics.database.status = `✅ Connected (${Date.now() - start}ms)`;
  } catch (err: any) {
    diagnostics.database.status = '❌ Failed';
    diagnostics.database.error = err.message || 'Unknown database error';
  }

  return NextResponse.json(diagnostics);
}
