import { runNotificationDetectors } from '@/services/notification-detector.service';
import { publishDueAdminMessageBrowserPushes } from '@/services/admin-message.service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [counts, adminMessagePushCounts] = await Promise.all([
      runNotificationDetectors(),
      publishDueAdminMessageBrowserPushes(),
    ]);
    return NextResponse.json({ success: true, counts, adminMessagePushCounts });
  } catch (error) {
    console.error('Notification cron error:', error);
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 });
  }
}
