import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSignature, getUploadUrl } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folder } = await req.json();
    const timestamp = Math.round(Date.now() / 1000).toString();

    const paramsToSign: Record<string, string> = {
      timestamp,
      folder: folder || 'nexus',
    };

    const signature = generateSignature(paramsToSign);

    return NextResponse.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: folder || 'nexus',
        uploadUrl: getUploadUrl(),
      },
    });
  } catch (error) {
    console.error('Upload sign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
