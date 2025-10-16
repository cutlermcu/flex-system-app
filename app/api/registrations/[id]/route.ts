import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: registration } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (registration.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (registration.status === 'locked') {
      return NextResponse.json({ error: 'Cannot delete locked registration' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}