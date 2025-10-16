// app/api/admin/flex-dates/[id]/route.ts
// Edit and delete specific flex dates

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// PUT - Update flex date
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { flex_type, duration_minutes, selection_deadline, is_locked } = body;

    // Build update object with only provided fields
    const updates: any = {};
    if (flex_type) updates.flex_type = flex_type;
    if (duration_minutes) updates.duration_minutes = duration_minutes;
    if (selection_deadline) updates.selection_deadline = selection_deadline;
    if (is_locked !== undefined) updates.is_locked = is_locked;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update flex date
    const { data: flexDate, error: updateError } = await adminClient
      .from('flex_dates')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log audit
    await adminClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'update_flex_date',
        details: { flex_date_id: params.id, updates },
      });

    return NextResponse.json({ success: true, flexDate });
  } catch (error) {
    console.error('Error updating flex date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete flex date
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Get flex date details before deleting
    const { data: flexDate } = await adminClient
      .from('flex_dates')
      .select('date')
      .eq('id', params.id)
      .single();

    if (!flexDate) {
      return NextResponse.json({ error: 'Flex date not found' }, { status: 404 });
    }

    // Check if there are sessions on this date
    const { count: sessionCount } = await adminClient
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('date', flexDate.date);

    if (sessionCount && sessionCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete. ${sessionCount} session(s) exist for this date. Delete sessions first.` 
      }, { status: 400 });
    }

    // Delete flex date
    const { error: deleteError } = await adminClient
      .from('flex_dates')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Log audit
    await adminClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'delete_flex_date',
        details: { flex_date_id: params.id, date: flexDate.date },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flex date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}