import { NextResponse } from 'next/server';
import { publishDueAdminMessageBrowserPushes } from '@/services/admin-message.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const counts = await publishDueAdminMessageBrowserPushes();
    return NextResponse.json({ success: true, counts });
  } catch (error) {
    console.error('Admin message push cron error:', error);
    return NextResponse.json({ error: 'Failed to process admin message browser pushes' }, { status: 500 });
  }
}
