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

    // Get upcoming flex dates (next 30 days)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { count: upcomingFlexDates } = await adminClient
      .from('flex_dates')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
      .lte('date', thirtyDaysLater);

    // Get session stats
    const { data: sessions } = await adminClient
      .from('sessions')
      .select('id, capacity, date')
      .gte('date', today);

    let overCapacity = 0;
    let emptySessions = 0;

    if (sessions) {
      for (const session of sessions) {
        const { count: enrolled } = await adminClient
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        if (enrolled && enrolled > session.capacity) {
          overCapacity++;
        }
        if (enrolled === 0) {
          emptySessions++;
        }
      }
    }

    // Get students without selections for the next flex date
    const { data: nextFlexDate } = await adminClient
      .from('flex_dates')
      .select('date')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    let studentsWithoutSelection = 0;
    if (nextFlexDate) {
      const { data: registrations } = await adminClient
        .from('registrations')
        .select('student_id')
        .eq('date', nextFlexDate.date);

      const registeredStudentIds = new Set(registrations?.map(r => r.student_id) || []);
      studentsWithoutSelection = (students || 0) - registeredStudentIds.size;
    }

    return NextResponse.json({
      users: {
        total: total || 0,
        students: students || 0,
        teachers: teachers || 0,
      },
      flex_dates: {
        upcoming: upcomingFlexDates || 0,
      },
      sessions: {
        over_capacity: overCapacity,
        empty: emptySessions,
      },
      registrations: {
        students_without_selection: studentsWithoutSelection,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}