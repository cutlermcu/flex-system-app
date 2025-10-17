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
    const { count: totalUsers } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: studentCount } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    const { count: teacherCount } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher');

    // Get upcoming flex dates
    const today = new Date().toISOString().split('T')[0];
    const { count: upcomingFlexDates } = await adminClient
      .from('flex_dates')
      .select('*', { count: 'exact', head: true })
      .gte('date', today);

    // Get students without selections for upcoming dates
    const { data: upcomingDates } = await adminClient
      .from('flex_dates')
      .select('date')
      .gte('date', today)
      .lte('date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    let studentsWithoutSelections = 0;
    if (upcomingDates && upcomingDates.length > 0) {
      for (const flexDate of upcomingDates) {
        const { data: registrations } = await adminClient
          .from('registrations')
          .select('student_id')
          .eq('date', flexDate.date);

        const registeredStudentIds = new Set(registrations?.map(r => r.student_id) || []);
        studentsWithoutSelections += (studentCount || 0) - registeredStudentIds.size;
      }
    }

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        studentCount: studentCount || 0,
        teacherCount: teacherCount || 0,
        upcomingFlexDates: upcomingFlexDates || 0,
        studentsWithoutSelections,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}