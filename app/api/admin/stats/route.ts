// app/api/admin/stats/route.ts
// SAVE THIS AS: app/api/admin/stats/route.ts
// Get system overview stats for admin dashboard

import { createServerClient } from '@/lib/supabase/server';
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

    // Get all the stats in parallel
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      upcomingFlexDates,
      totalSessions,
      totalRegistrations,
      studentsWithoutSelection,
      overCapacitySessions,
      emptySessions,
    ] = await Promise.all([
      // Total users
      supabase.from('users').select('*', { count: 'exact', head: true }),
      
      // Total students
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      
      // Total teachers
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      
      // Total admins
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      
      // Upcoming flex dates
      supabase.from('flex_dates').select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0]),
      
      // Total sessions (future)
      supabase.from('sessions').select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0]),
      
      // Total registrations (future)
      supabase.from('registrations').select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0]),
      
      // Students without selection for upcoming dates
      getStudentsWithoutSelection(supabase),
      
      // Over-capacity sessions
      getOverCapacitySessions(supabase),
      
      // Empty sessions
      getEmptySessions(supabase),
    ]);

    const stats = {
      users: {
        total: totalUsers.count || 0,
        students: totalStudents.count || 0,
        teachers: totalTeachers.count || 0,
        admins: totalAdmins.count || 0,
      },
      flex_dates: {
        upcoming: upcomingFlexDates.count || 0,
      },
      sessions: {
        total: totalSessions.count || 0,
        over_capacity: overCapacitySessions.length,
        empty: emptySessions.length,
      },
      registrations: {
        total: totalRegistrations.count || 0,
        students_without_selection: studentsWithoutSelection,
      },
      alerts: {
        over_capacity_sessions: overCapacitySessions,
        empty_sessions: emptySessions,
        students_without_selection: studentsWithoutSelection,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getStudentsWithoutSelection(supabase: any) {
  // Get next flex date
  const { data: nextFlexDate } = await supabase
    .from('flex_dates')
    .select('date')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (!nextFlexDate) return 0;

  // Count students
  const { count: totalStudents } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  // Count students with registrations
  const { count: studentsWithRegistrations } = await supabase
    .from('registrations')
    .select('student_id', { count: 'exact', head: true })
    .eq('date', nextFlexDate.date);

  return (totalStudents || 0) - (studentsWithRegistrations || 0);
}

async function getOverCapacitySessions(supabase: any) {
  // Get future sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, title, room_number, capacity, date, teacher:users!sessions_teacher_id_fkey(name)')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!sessions) return [];

  // Check enrollment for each
  const overCapacity = [];
  for (const session of sessions) {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (count && count > session.capacity) {
      overCapacity.push({
        ...session,
        enrolled: count,
        over_by: count - session.capacity,
      });
    }
  }

  return overCapacity;
}

async function getEmptySessions(supabase: any) {
  // Get future sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, title, room_number, date, teacher:users!sessions_teacher_id_fkey(name)')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!sessions) return [];

  // Check enrollment for each
  const empty = [];
  for (const session of sessions) {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (!count || count === 0) {
      empty.push(session);
    }
  }

  return empty;
}