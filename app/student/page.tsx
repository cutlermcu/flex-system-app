'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface FlexDate {
  id: string;
  date: string;
  flex_type: string;
  duration_minutes: number;
  selection_deadline: string;
  is_locked: boolean;
  total_sessions: number;
  students_registered: number;
  my_registration: {
    id: string;
    status: string;
    session: {
      id: string;
      title: string;
      room_number: string;
      teacher: { name: string };
    };
  } | null;
}

interface Session {
  id: string;
  title: string;
  long_description?: string;
  room_number: string;
  capacity: number;
  allowed_grades: number[];
  teacher: { name: string; email: string };
  enrolled: number;
  is_full: boolean;
  my_registration: any;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  flex_date: string;
  created_at: string;
  session?: {
    id: string;
    title: string;
    room_number: string;
    teacher: { name: string };
  };
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flexDates, setFlexDates] = useState<FlexDate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Modal states
  const [selectedDate, setSelectedDate] = useState<FlexDate | null>(null);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'student') {
        router.push(`/${userData?.role}`);
        return;
      }

      setUser(userData);
      await Promise.all([fetchFlexDates(), fetchNotifications()]);
      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/');
    }
  }

  async function fetchFlexDates() {
    try {
      const response = await fetch('/api/flex-dates/upcoming');
      const data = await response.json();
      if (response.ok) {
        setFlexDates(data.flexDates || []);
      }
    } catch (error) {
      console.error('Error fetching flex dates:', error);
    }
  }

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications/my-notifications');
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  async function openSessionModal(flexDate: FlexDate) {
    setSelectedDate(flexDate);
    setShowSessionModal(true);
    setLoadingSessions(true);

    try {
      const response = await fetch(`/api/sessions/available?date=${flexDate.date}`);
      const data = await response.json();
      
      if (response.ok) {
        setAvailableSessions(data.sessions || []);
      } else {
        alert('Failed to load sessions');
        setShowSessionModal(false);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      alert('Failed to load sessions');
      setShowSessionModal(false);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function selectSession(sessionId: string) {
    setRegistering(true);
    try {
      const response = await fetch('/api/registrations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (response.ok) {
        await fetchFlexDates();
        setShowSessionModal(false);
        alert('Successfully registered for session!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to register');
      }
    } catch (error) {
      console.error('Error registering:', error);
      alert('Failed to register for session');
    } finally {
      setRegistering(false);
    }
  }

  async function cancelRegistration(registrationId: string) {
    if (!confirm('Are you sure you want to cancel this registration?')) return;

    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFlexDates();
        alert('Registration cancelled');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel');
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      alert('Failed to cancel registration');
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications/my-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">My Flex Time</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
              )}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">Grade {user?.grade}</p>
            </div>
            <button onClick={signOut} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upcoming Flex Days</h2>
          <p className="text-gray-600">Select your sessions for upcoming flex time periods</p>
        </div>

        {flexDates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600">No upcoming flex days</p>
            <p className="text-sm text-gray-500 mt-1">Check back later for new flex time opportunities</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {flexDates.map((flexDate) => {
              const deadline = new Date(flexDate.selection_deadline);
              const isPast = new Date() > deadline;
              const isRegistered = !!flexDate.my_registration;
              const isLocked = flexDate.my_registration?.status === 'locked';

              return (
                <div
                  key={flexDate.id}
                  className={`bg-white rounded-lg border-2 p-6 transition-all ${
                    isRegistered ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          flexDate.flex_type === 'ACCESS' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {flexDate.flex_type}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {new Date(flexDate.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-sm text-gray-600">
                          {flexDate.duration_minutes} minutes
                        </span>
                      </div>

                      {isRegistered ? (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-semibold text-gray-900">
                            {flexDate.my_registration?.session.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-7">
                            <span>Room {flexDate.my_registration?.session.room_number}</span>
                            <span>•</span>
                            <span>{flexDate.my_registration?.session.teacher.name}</span>
                            {isLocked && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-medium flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  Locked
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">Not signed up yet</span>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Deadline: {deadline.toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span>{flexDate.total_sessions} sessions available</span>
                        <span>{flexDate.students_registered} students registered</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRegistered && !isLocked && !isPast && (
                        <button
                          onClick={() => cancelRegistration(flexDate.my_registration!.id)}
                          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {!isPast && (
                        <button
                          onClick={() => openSessionModal(flexDate)}
                          disabled={isLocked}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isLocked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isRegistered
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isLocked ? 'Locked' : isRegistered ? 'Change Session' : 'Select Session'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Selection Modal */}
      {showSessionModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Select a Session</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedDate.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingSessions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading sessions...</p>
                </div>
              ) : availableSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No sessions available for your grade</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        session.my_registration
                          ? 'border-blue-600 bg-blue-50'
                          : session.is_full
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{session.title}</h3>
                          {session.long_description && (
                            <p className="text-sm text-gray-600 mb-3">{session.long_description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {session.teacher.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {session.enrolled}/{session.capacity} students
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Room {session.room_number}
                            </span>
                          </div>
                        </div>

                        <div className="ml-4">
                          {session.my_registration ? (
                            <div className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Selected
                            </div>
                          ) : session.is_full ? (
                            <div className="px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded-lg">
                              Full
                            </div>
                          ) : (
                            <button
                              onClick={() => selectSession(session.id)}
                              disabled={registering}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {registering ? 'Selecting...' : 'Select'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-gray-600 text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg ${
                        notification.read ? 'bg-gray-50' : 'bg-red-50 border-2 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.type === 'removed' && (
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                          )}
                          {notification.type === 'locked' && (
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          )}
                          {notification.type === 'system' && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.type === 'removed' && 'Removed from Session'}
                              {notification.type === 'locked' && 'Locked to Session'}
                              {notification.type === 'system' && 'System Notification'}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {notification.message}
                          </p>
                          {notification.session && (
                            <div className="text-xs text-gray-600 bg-white rounded px-2 py-1 inline-block">
                              {notification.session.title} • Room {notification.session.room_number}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}