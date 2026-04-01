import { processRecurringTransactions } from '@/services/recurring.service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret if needed
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await processRecurringTransactions();
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
