// app/api/admin/stats/route.ts
// Get dashboard overview statistics

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Get user counts
    const { count: total } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: students } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    const { count: teachers } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher');

    const { count: admins } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    // Get upcoming flex dates (next 30 days)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { count: upcomingFlexDates } = await adminClient
      .from('flex_dates')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
      .lte('date', thirtyDaysLater);

    return NextResponse.json({
      total: total || 0,
      students: students || 0,
      teachers: teachers || 0,
      admins: admins || 0,
      upcomingFlexDates: upcomingFlexDates || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}