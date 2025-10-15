import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, grade')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'student') {
      return NextResponse.json({ error: 'Only students can register' }, { status: 403 });
    }

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session with flex date info
    const { data: session } = await supabase
      .from('sessions')
      .select(`*, flex_dates!inner(selection_deadline, is_locked)`)
      .eq('id', session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validations
    const sessionDate = new Date(session.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    if (sessionDate < today || sessionDate > sevenDays) {
      return NextResponse.json({ error: 'Can only register within 7 days' }, { status: 400 });
    }

    if (new Date() > new Date(session.flex_dates.selection_deadline)) {
      return NextResponse.json({ error: 'Deadline passed' }, { status: 400 });
    }

    if (!session.allowed_grades.includes(userData.grade)) {
      return NextResponse.json({ error: 'Grade not allowed' }, { status: 400 });
    }

    // Check if locked to another session
    const { data: lockedReg } = await supabase
      .from('registrations')
      .select('id')
      .eq('student_id', user.id)
      .eq('date', session.date)
      .eq('status', 'locked')
      .single();

    if (lockedReg) {
      return NextResponse.json({ error: 'Locked to another session' }, { status: 400 });
    }

    // Check capacity
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id);

    if (count && count >= session.capacity) {
      return NextResponse.json({ error: 'Session full' }, { status: 400 });
    }

    // Delete existing registration for this date
    await supabase
      .from('registrations')
      .delete()
      .eq('student_id', user.id)
      .eq('date', session.date);

    // Create new registration
    const { data: registration, error: insertError } = await supabase
      .from('registrations')
      .insert({
        session_id,
        student_id: user.id,
        status: 'selected'
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}