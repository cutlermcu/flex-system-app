// app/api/auth/callback/route.ts
// This handles the OAuth callback from Google after user signs in

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ 
      cookies: async () => await cookies() 
    });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page after successful login
  return NextResponse.redirect(requestUrl.origin);
}

export const dynamic = 'force-dynamic';