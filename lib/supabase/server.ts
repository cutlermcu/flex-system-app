// lib/supabase/server.ts
// This is the SERVER-SIDE Supabase client
// Use this in API routes (server code)

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createServerClient = async () => {
  return createRouteHandlerClient({ 
    cookies: async () => await cookies() 
  });
};