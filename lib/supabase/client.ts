// lib/supabase/client.ts
// This is the CLIENT-SIDE Supabase client
// Use this in React components (browser code)

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  return createClientComponentClient();
};