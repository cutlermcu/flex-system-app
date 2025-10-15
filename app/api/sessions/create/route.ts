// app/api/sessions/create/route.ts
// This creates a new session (teacher only)
// Can create recurring sessions for all future flex days of the same type

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      date, 
      room_number, 
      capacity, 
      title, 
      long_description, 
      allowed_grades, 
      recurring, 
      save_as_template, 
      template_name 
    } = body;

    // Validation
    if (!date || !room_number || !capacity || !title || !allowed_grades || allowed_grades.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if teacher already has a session on this date
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('date', date)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You already have a session on this date' }, { status: 400 });
    }

    // Create session(s)
    const sessionsToCreate = [];

    if (recurring) {
      // Get all future flex dates of the same type
      const { data: flexDate } = await supabase
        .from('flex_dates')
        .select('flex_type')
        .eq('date', date)
        .single();

      if (flexDate) {
        const { data: futureDates } = await supabase
          .from('flex_dates')
          .select('date')
          .eq('flex_type', flexDate.flex_type)
          .gte('date', date);

        if (futureDates) {
          futureDates.forEach(fd => {
            sessionsToCreate.push({
              date: fd.date,
              teacher_id: user.id,
              room_number,
              capacity,
              title,
              long_description,
              allowed_grades
            });
          });
        }
      }
    } else {
      sessionsToCreate.push({
        date,
        teacher_id: user.id,
        room_number,
        capacity,
        title,
        long_description,
        allowed_grades
      });
    }

    // Insert sessions
    const { data: sessions, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionsToCreate)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Save as template if requested
    if (save_as_template && template_name) {
      await supabase
        .from('session_templates')
        .insert({
          teacher_id: user.id,
          name: template_name,
          room_number,
          capacity,
          title,
          long_description,
          allowed_grades
        });
    }

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}