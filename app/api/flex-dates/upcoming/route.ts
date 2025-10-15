// app/api/flex-dates/upcoming/route.ts
// Get flex dates in the next 7 days for the current user
// Students see dates within 7 days, teachers/admins see all future dates

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Students see 7 days ahead, teachers/admins see all future dates
    const maxDate = new Date(today);
    if (userData.role === 'student') {
      maxDate.setDate(maxDate.getDate() + 7);
    } else {
      maxDate.setFullYear(maxDate.getFullYear() + 1); // Show up to 1 year for teachers/admins
    }

    // Get flex dates with registration status for the user
    const { data: flexDates, error } = await supabase
      .from('flex_dates')
      .select(`
        *,
        sessions!inner(
          id,
          title,
          room_number,
          teacher:users!sessions_teacher_id_fkey(name)
        )
      `)
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', maxDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching flex dates:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // For each flex date, get the user's registration status
    const flexDatesWithStatus = await Promise.all(
      flexDates.map(async (flexDate) => {
        // Get user's registration for this date
        const { data: registration } = await supabase
          .from('registrations')
          .select(`
            id,
            status,
            locked_by_teacher_id,
            session:sessions(
              id,
              title,
              room_number,
              teacher:users!sessions_teacher_id_fkey(name)
            )
          `)
          .eq('student_id', userData.id)
          .eq('date', flexDate.date)
          .single();

        // Count total sessions for this date
        const { count: totalSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('date', flexDate.date);

        // Count students registered for this date
        const { count: studentsRegistered } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('date', flexDate.date);

        return {
          ...flexDate,
          total_sessions: totalSessions || 0,
          students_registered: studentsRegistered || 0,
          my_registration: registration || null,
        };
      })
    );

    return NextResponse.json({ 
      flexDates: flexDatesWithStatus,
      today: today.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error in upcoming flex dates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}