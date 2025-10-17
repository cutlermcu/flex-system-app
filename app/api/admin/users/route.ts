// app/api/admin/users/route.ts
// List all users and create new ones

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET - List all users with filters
export async function GET(request: Request) {
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

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const searchQuery = searchParams.get('search');

    let query = adminClient
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user
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
    const { email, name, role, grade, homeroom } = body;

    // Validation
    if (!email || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'student' && !grade) {
      return NextResponse.json({ error: 'Grade required for students' }, { status: 400 });
    }

    // Create user in auth
    const { data: authUser, error: authError2 } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (authError2) {
      return NextResponse.json({ error: authError2.message }, { status: 400 });
    }

    // Create user record
    const userData2: any = {
      id: authUser.user.id,
      email,
      name,
      role,
    };

    if (role === 'student') {
      userData2.grade = grade;
      userData2.homeroom = homeroom;
    }

    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert(userData2)
      .select()
      .single();

    if (insertError) {
      // Rollback auth user if database insert fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Log audit
    await adminClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'create_user',
        details: { new_user_id: newUser.id, email, role },
      });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}