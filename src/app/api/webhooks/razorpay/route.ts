
import { NextRequest, NextResponse } from 'next/server';
import { updateProviderSubscription } from '@/lib/actions';
import { getAdminSettings } from '@/lib/data';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const adminSettings = await getAdminSettings();
    const secret = adminSettings?.razorpay?.webhookSecret;

    if (!secret) {
      console.error('Razorpay webhook secret is not configured.');
      return new NextResponse('Webhook secret not configured.', { status: 500 });
    }

    const text = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return new NextResponse('Signature not found.', { status: 400 });
    }
    
    // 1. Verify the signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(text);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== signature) {
      return new NextResponse('Invalid signature.', { status: 403 });
    }

    const event = JSON.parse(text);

    // 2. Handle the 'payment.captured' event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const notes = payment.notes;
      const { planId, providerUsername } = notes;

      if (planId && providerUsername) {
        // 3. Update the subscription
        await updateProviderSubscription(providerUsername, planId, {
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          amount: payment.amount / 100, // Convert from paise to rupees
        });
        console.log(`Webhook: Successfully updated subscription for ${providerUsername} to plan ${planId}.`);
      } else {
        console.warn('Webhook received but missing planId or providerUsername in notes.', notes);
      }
    }

    return new NextResponse('Webhook processed.', { status: 200 });

  } catch (error: any) {
    console.error('Error processing Razorpay webhook:', error);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
  }
}
