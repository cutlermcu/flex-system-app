// app/api/notifications/my-notifications/route.ts
// Get all notifications for the current user
// Includes unread count and full notification details

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let notificationsQuery = supabase
      .from('notifications')
      .select(`
        id,
        type,
        message,
        read,
        flex_date,
        created_at,
        session:sessions(
          id,
          title,
          room_number,
          teacher:users!sessions_teacher_id_fkey(name)
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by read status if requested
    if (unreadOnly) {
      notificationsQuery = notificationsQuery.eq('read', false);
    }

    const { data: notifications, error: notificationsError } = await notificationsQuery;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json({ error: notificationsError.message }, { status: 400 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in my notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, mark_all_read } = body;

    if (mark_all_read) {
      // Mark all notifications as read for this user
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('student_id', user.id)
        .eq('read', false);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (notification_id) {
      // Mark specific notification as read
      // First verify it belongs to the user
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .select('student_id')
        .eq('id', notification_id)
        .single();

      if (notifError || !notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      if (notification.student_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Update the notification
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        error: 'Either notification_id or mark_all_read must be provided' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}