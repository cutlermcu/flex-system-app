// app/api/admin/flex-dates/route.ts
// Admin endpoints for managing flex dates

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET - List all flex dates (admin only)
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

    // Get all flex dates with session counts
    const { data: flexDates, error } = await supabase
      .from('flex_dates')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Enhance with session and registration counts
    const enhancedDates = await Promise.all(
      (flexDates || []).map(async (flexDate) => {
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('date', flexDate.date);

        const { count: registrationCount } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('date', flexDate.date);

        return {
          ...flexDate,
          session_count: sessionCount || 0,
          registration_count: registrationCount || 0,
        };
      })
    );

    return NextResponse.json({ flexDates: enhancedDates });
  } catch (error) {
    console.error('Error fetching flex dates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new flex date (admin only)
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

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { date, flex_type, duration_minutes, selection_deadline, is_locked } = body;

    // Validation
    if (!date || !flex_type || !duration_minutes || !selection_deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['ACCESS', 'STUDY TIME'].includes(flex_type)) {
      return NextResponse.json({ error: 'Invalid flex_type' }, { status: 400 });
    }

    if (![45, 90].includes(duration_minutes)) {
      return NextResponse.json({ error: 'Duration must be 45 or 90 minutes' }, { status: 400 });
    }

    // Check if date already exists
    const { data: existing } = await adminClient
      .from('flex_dates')
      .select('id')
      .eq('date', date)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Flex date already exists for this date' }, { status: 400 });
    }

    // Create flex date
    const { data: flexDate, error: insertError } = await adminClient
      .from('flex_dates')
      .insert({
        date,
        flex_type,
        duration_minutes,
        selection_deadline,
        is_locked: is_locked || false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Log audit
    await adminClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'create_flex_date',
        details: { flex_date_id: flexDate.id, date, flex_type },
      });

    return NextResponse.json({ success: true, flexDate });
  } catch (error) {
    console.error('Error creating flex date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}