
import { handleGoogleCallback } from '@/lib/calendar.actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
        return NextResponse.redirect(new URL('/calendar-setup?error=Authorization code not found.', req.url));
    }
    
    if (!state) {
        return NextResponse.redirect(new URL('/calendar-setup?error=State parameter missing. Could not identify user.', req.url));
    }

    // The 'state' parameter now contains the username.
    const username = state;

    const result = await handleGoogleCallback(code, username);

    if (result.success) {
        return NextResponse.redirect(new URL('/calendar-setup', req.url));
    } else {
        return NextResponse.redirect(new URL(`/calendar-setup?error=${encodeURIComponent(result.error || 'Unknown error')}`, req.url));
    }
}
