// app/api/auth/signout/route.ts
// This handles user sign out

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createRouteHandlerClient({ 
    cookies: async () => await cookies() 
  });
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}

export const dynamic = 'force-dynamic';