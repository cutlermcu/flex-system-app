import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
export async function POST(request: Request) {
    try {
      const supabase = await createServerClient();
      const adminClient = createAdminClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const body = await request.json();
      const { registration_id } = body;
  
      const { data: registration } = await adminClient
        .from('registrations')
        .select('*, session:sessions(teacher_id)')
        .eq('id', registration_id)
        .single();
  
      if (!registration) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
  
      // Verify authorization
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
  
      if (userData?.role !== 'admin' && registration.locked_by_teacher_id !== user.id) {
        return NextResponse.json({ error: 'Only locking teacher or admin can unlock' }, { status: 403 });
      }
  
      // Update status
      await adminClient
        .from('registrations')
        .update({
          status: 'selected',
          locked_by_teacher_id: null
        })
        .eq('id', registration_id);
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error unlocking student:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }