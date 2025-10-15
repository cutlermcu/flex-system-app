// lib/supabase/admin.ts
// This is the ADMIN Supabase client
// Uses service role key to BYPASS Row Level Security
// Only use this for admin operations like sending emails, removing students, etc.

import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};