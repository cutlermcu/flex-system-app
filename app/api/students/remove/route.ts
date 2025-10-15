import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendRemovalEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['teacher', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { registration_id } = body;

    // Get full details using admin client (bypasses RLS)
    const { data: registration } = await adminClient
      .from('registrations')
      .select(`
        *,
        session:sessions(*,
          teacher:users!sessions_teacher_id_fkey(name),
          flex_date:flex_dates!sessions_date_fkey(selection_deadline)
        ),
        student:users!registrations_student_id_fkey(name, email)
      `)
      .eq('id', registration_id)
      .single();

    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify teacher owns session (unless admin)
    if (userData.role === 'teacher' && registration.session.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Can only remove from your sessions' }, { status: 403 });
    }

    // Delete registration
    await adminClient
      .from('registrations')
      .delete()
      .eq('id', registration_id);

    // Create notification
    await adminClient
      .from('notifications')
      .insert({
        student_id: registration.student_id,
        type: 'removed',
        session_id: registration.session_id,
        flex_date: registration.session.date,
        message: `You have been removed from ${registration.session.title}. Please select another session.`,
        read: false
      });

    // Send email
    const emailResult = await sendRemovalEmail({
      studentEmail: registration.student.email,
      studentName: registration.student.name,
      sessionTitle: registration.session.title,
      teacherName: registration.session.teacher.name,
      room: registration.session.room_number,
      flexDate: registration.session.date,
      deadline: registration.session.flex_date.selection_deadline
    });

    // Log audit
    await adminClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'remove_student',
        details: {
          registration_id,
          student_id: registration.student_id,
          session_id: registration.session_id,
          session_title: registration.session.title
        }
      });

    return NextResponse.json({ success: true, emailSent: emailResult.success });
  } catch (error) {
    console.error('Error removing student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}