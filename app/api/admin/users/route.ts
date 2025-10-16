// app/api/admin/users/route.ts
// Admin endpoints for user management

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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    // Filter by role
    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      query = query.eq('role', role);
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user (admin only)
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

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'student' && !grade) {
      return NextResponse.json({ error: 'Grade required for students' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // IMPORTANT: Users must sign in with Google OAuth first before we can create their record
    // We cannot create user records without a valid auth.users ID
    // This is a limitation of Supabase's auth system
    
    return NextResponse.json({ 
      error: 'User creation via admin panel is not supported. Users must sign in with Google OAuth first, then you can update their role/grade.',
      info: 'Have the user visit the login page and sign in with Google. Their account will be created automatically, then you can edit their role here.'
    }, { status: 400 });

    // NOTE: If you want to enable this feature, you need to:
    // 1. Use Supabase Admin API to create auth.users record first
    // 2. Then create the users table record with that ID
    // This requires the service role key and additional setup

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}