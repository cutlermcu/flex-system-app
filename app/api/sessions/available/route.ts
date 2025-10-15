// app/api/sessions/available/route.ts
// Get all available sessions for a specific date
// Students only see sessions for their grade
// Returns enrollment counts and capacity info

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

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, grade, id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // Get flex date info
    const { data: flexDate, error: flexDateError } = await supabase
      .from('flex_dates')
      .select('*')
      .eq('date', date)
      .single();

    if (flexDateError || !flexDate) {
      return NextResponse.json({ error: 'Flex date not found' }, { status: 404 });
    }

    // Build query for sessions
    let sessionsQuery = supabase
      .from('sessions')
      .select(`
        id,
        date,
        teacher_id,
        room_number,
        capacity,
        title,
        long_description,
        allowed_grades,
        created_at,
        teacher:users!sessions_teacher_id_fkey(
          name,
          email
        )
      `)
      .eq('date', date);

    // Students only see sessions for their grade
    // Teachers and admins see all sessions
    if (userData.role === 'student' && userData.grade) {
      sessionsQuery = sessionsQuery.contains('allowed_grades', [userData.grade]);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: sessionsError.message }, { status: 400 });
    }

    // For each session, get enrollment count and check if user is registered
    const sessionsWithEnrollment = await Promise.all(
      (sessions || []).map(async (session) => {
        // Get enrollment count
        const { count: enrolledCount } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        // Check if current user is registered for this session
        const { data: myRegistration } = await supabase
          .from('registrations')
          .select('id, status, locked_by_teacher_id')
          .eq('session_id', session.id)
          .eq('student_id', userData.id)
          .single();

        // Calculate if session is full
        const isFull = (enrolledCount || 0) >= session.capacity;

        return {
          ...session,
          enrolled: enrolledCount || 0,
          is_full: isFull,
          my_registration: myRegistration || null,
        };
      })
    );

    // Get user's current registration for this date (if any)
    const { data: currentRegistration } = await supabase
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
      .eq('date', date)
      .single();

    return NextResponse.json({
      flexDate,
      sessions: sessionsWithEnrollment,
      myCurrentRegistration: currentRegistration || null,
      canSelect: new Date() < new Date(flexDate.selection_deadline) && !flexDate.is_locked,
    });
  } catch (error) {
    console.error('Error in available sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}