// app/api/admin/users/[id]/route.ts
// Edit and delete users

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// PUT - Update user
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
    const { name, role, grade, homeroom } = body;

    // Build update object
    const updates: any = {};
    if (name) updates.name = name;
    if (role) {
      if (!['student', 'teacher', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updates.role = role;
      
      // Clear grade/homeroom if not student
      if (role !== 'student') {
        updates.grade = null;
        updates.homeroom = null;
      }
    }
    if (grade !== undefined) updates.grade = grade;
    if (homeroom !== undefined) updates.homeroom = homeroom;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update user
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
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
        action: 'update_user',
        details: { updated_user_id: params.id, updates },
      });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user
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

    // Can't delete yourself
    if (params.id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get user details before deleting
    const { data: userToDelete } = await adminClient
      .from('users')
      .select('email, role')
      .eq('id', params.id)
      .single();

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a teacher with sessions
    if (userToDelete.role === 'teacher') {
      const { count: sessionCount } = await adminClient
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', params.id);

      if (sessionCount && sessionCount > 0) {
        return NextResponse.json({ 
          error: `Cannot delete. Teacher has ${sessionCount} session(s). Delete or reassign sessions first.` 
        }, { status: 400 });
      }
    }

    // Delete user (cascades will handle related records)
    const { error: deleteError } = await adminClient
      .from('users')
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
        action: 'delete_user',
        details: { deleted_user_id: params.id, email: userToDelete.email },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}