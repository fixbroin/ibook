
import { checkAndSendExpiryEmails } from '@/lib/admin.actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authorizationHeader = req.headers.get('authorization');
  
  if (authorizationHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await checkAndSendExpiryEmails();
    return NextResponse.json({ success: true, message: `Cron job executed successfully. Sent ${result.count} emails.` });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
