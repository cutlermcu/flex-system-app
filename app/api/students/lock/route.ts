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
      const { student_id, session_id } = body;
  
      const { data: session } = await supabase
        .from('sessions')
        .select('*, flex_dates(*)')
        .eq('id', session_id)
        .single();
  
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
  
      // Verify teacher owns session (unless admin)
      if (userData.role === 'teacher' && session.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Can only lock to your sessions' }, { status: 403 });
      }
  
      // Check if already locked elsewhere
      const { data: existingLocks } = await adminClient
        .from('registrations')
        .select('*, session:sessions(date, teacher:users!sessions_teacher_id_fkey(name))')
        .eq('student_id', student_id)
        .eq('status', 'locked');
  
      const lockedOnThisDate = existingLocks?.find(
        lock => lock.session.date === session.date
      );
  
      if (lockedOnThisDate) {
        return NextResponse.json({ 
          error: `Already locked by ${lockedOnThisDate.session.teacher.name}` 
        }, { status: 400 });
      }
  
      // Remove other registrations for this date
      const { data: otherSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('date', session.date);
  
      if (otherSessions) {
        await adminClient
          .from('registrations')
          .delete()
          .eq('student_id', student_id)
          .in('session_id', otherSessions.map(s => s.id));
      }
  
      // Create/update locked registration
      const { data: registration, error: insertError } = await adminClient
        .from('registrations')
        .upsert({
          session_id,
          student_id,
          status: 'locked',
          locked_by_teacher_id: user.id
        })
        .select()
        .single();
  
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
  
      // Create notification
      await adminClient
        .from('notifications')
        .insert({
          student_id,
          type: 'locked',
          session_id,
          flex_date: session.date,
          message: `You have been locked to ${session.title}. You cannot change this selection.`,
          read: false
        });
  
      return NextResponse.json({ success: true, registration });
    } catch (error) {
      console.error('Error locking student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }