// app/teacher/page.tsx
// Complete Teacher Dashboard with session management

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import RoleSwitcher from '@/components/RoleSwitcher';

type Tab = 'sessions' | 'templates' | 'calendar';

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [flexDates, setFlexDates] = useState<any[]>([]);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [activeTab, user]);

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

      if (userData?.role !== 'teacher') {
        router.push(`/${userData?.role}`);
        return;
      }

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/');
    }
  }

  async function loadData() {
    switch (activeTab) {
      case 'sessions':
        await Promise.all([loadSessions(), loadFlexDates()]);
        break;
      case 'templates':
        await loadTemplates();
        break;
      case 'calendar':
        await loadSessions();
        break;
    }
  }

  async function loadSessions() {
    try {
      // Get teacher's sessions with registrations
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select(`
          *,
          flex_dates!inner(flex_type, duration_minutes, selection_deadline),
          registrations(
            id,
            status,
            student:users!registrations_student_id_fkey(name, email, grade)
          )
        `)
        .eq('teacher_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setSessions(sessionsData || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .eq('teacher_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async function loadFlexDates() {
    try {
      const response = await fetch('/api/flex-dates/upcoming');
      const data = await response.json();
      if (response.ok) {
        setFlexDates(data.flexDates || []);
      }
    } catch (error) {
      console.error('Error loading flex dates:', error);
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session? Students will be notified.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadSessions();
        alert('Session deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    }
  }

  async function removeStudent(registrationId: string) {
    if (!confirm('Remove this student? They will be notified via email.')) {
      return;
    }

    try {
      const response = await fetch('/api/students/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      if (response.ok) {
        await loadSessions();
        if (selectedSession) {
          // Reload session details
          const updated = sessions.find(s => s.id === selectedSession.id);
          setSelectedSession(updated);
        }
        alert('Student removed and notified');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove student');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student');
    }
  }

  async function lockStudent(studentId: string, sessionId: string) {
    if (!confirm('Lock this student to this session? They will not be able to change it.')) {
      return;
    }

    try {
      const response = await fetch('/api/students/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, session_id: sessionId }),
      });

      if (response.ok) {
        await loadSessions();
        if (selectedSession) {
          const updated = sessions.find(s => s.id === selectedSession.id);
          setSelectedSession(updated);
        }
        alert('Student locked to session');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to lock student');
      }
    } catch (error) {
      console.error('Error locking student:', error);
      alert('Failed to lock student');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <RoleSwitcher currentRole="teacher" userId={user?.id} />
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Flex Time Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">Teacher</p>
            </div>
            <button onClick={signOut} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {[
              { id: 'sessions', label: 'My Sessions', icon: '📚' },
              { id: 'templates', label: 'Templates', icon: '📋' },
              { id: 'calendar', label: 'Calendar', icon: '📅' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'sessions' && (
          <SessionsTab 
            sessions={sessions}
            flexDates={flexDates}
            onCreateNew={() => setShowCreateSessionModal(true)}
            onDelete={deleteSession}
            onViewRoster={(session: any) => {
              setSelectedSession(session);
              setShowRosterModal(true);
            }}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab 
            templates={templates}
            onCreateNew={() => setShowCreateTemplateModal(true)}
            onRefresh={loadTemplates}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab sessions={sessions} />
        )}
      </div>

      {/* Modals */}
      {showCreateSessionModal && (
        <CreateSessionModal 
          teacherId={user.id}
          flexDates={flexDates}
          templates={templates}
          onClose={() => setShowCreateSessionModal(false)}
          onSuccess={() => {
            setShowCreateSessionModal(false);
            loadSessions();
          }}
        />
      )}

      {showCreateTemplateModal && (
        <CreateTemplateModal 
          teacherId={user.id}
          onClose={() => setShowCreateTemplateModal(false)}
          onSuccess={() => {
            setShowCreateTemplateModal(false);
            loadTemplates();
          }}
        />
      )}

      {showRosterModal && selectedSession && (
        <RosterModal 
          session={selectedSession}
          onClose={() => {
            setShowRosterModal(false);
            setSelectedSession(null);
          }}
          onRemove={removeStudent}
          onLock={lockStudent}
        />
      )}
    </div>
  );
}

// Sessions Tab
function SessionsTab({ sessions, flexDates, onCreateNew, onDelete, onViewRoster }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">My Sessions</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <span>+</span>
          <span>Create Session</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">
            {sessions.reduce((sum: number, s: any) => sum + (s.registrations?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Upcoming Flex Dates</p>
          <p className="text-2xl font-bold text-gray-900">{flexDates.length}</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session: any) => (
          <div key={session.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    session.flex_dates.flex_type === 'ACCESS' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {session.flex_dates.flex_type}
                  </span>
                  {session.registrations.length >= session.capacity && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                      FULL
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div>
                    <span className="font-medium">Room:</span> {session.room_number}
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>{' '}
                    {session.registrations.length} / {session.capacity}
                  </div>
                  <div>
                    <span className="font-medium">Grades:</span> {session.allowed_grades.join(', ')}
                  </div>
                </div>

                {session.long_description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{session.long_description}</p>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onViewRoster(session)}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  View Roster ({session.registrations.length})
                </button>
                <button
                  onClick={() => onDelete(session.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No sessions created yet</p>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Create Your First Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Templates Tab
function TemplatesTab({ templates, onCreateNew, onRefresh }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Session Templates</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <span>+</span>
          <span>Create Template</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Templates</strong> let you quickly create sessions with pre-filled information. Save time by creating templates for sessions you run regularly!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template: any) => (
          <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-200 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Title:</span> {template.title}</p>
              <p><span className="font-medium">Room:</span> {template.room_number}</p>
              <p><span className="font-medium">Capacity:</span> {template.capacity}</p>
              <p><span className="font-medium">Grades:</span> {template.allowed_grades.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600 mb-4">No templates saved yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Create Your First Template
          </button>
        </div>
      )}
    </div>
  );
}

// Calendar Tab
function CalendarTab({ sessions }: any) {
  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc: any, session: any) => {
    const date = session.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  const dates = Object.keys(sessionsByDate).sort();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Calendar View</h2>

      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date} className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            <div className="space-y-2">
              {sessionsByDate[date].map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-900">{session.title}</p>
                    <p className="text-sm text-gray-600">
                      Room {session.room_number} • {session.registrations.length}/{session.capacity} students
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    session.flex_dates.flex_type === 'ACCESS' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {session.flex_dates.flex_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {dates.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No sessions scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Session Modal
function CreateSessionModal({ teacherId, flexDates, templates, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: '',
    room_number: '',
    capacity: 20,
    title: '',
    long_description: '',
    allowed_grades: [] as number[],
    recurring: false,
    save_as_template: false,
    template_name: '',
    use_template: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function applyTemplate(templateId: string) {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        room_number: template.room_number,
        capacity: template.capacity,
        title: template.title,
        long_description: template.long_description || '',
        allowed_grades: template.allowed_grades,
        use_template: templateId,
      });
    }
  }

  function toggleGrade(grade: number) {
    if (formData.allowed_grades.includes(grade)) {
      setFormData({
        ...formData,
        allowed_grades: formData.allowed_grades.filter(g => g !== grade),
      });
    } else {
      setFormData({
        ...formData,
        allowed_grades: [...formData.allowed_grades, grade].sort(),
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (formData.allowed_grades.length === 0) {
      alert('Please select at least one grade');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teacher_id: teacherId,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Use Template (optional)</label>
              <select
                value={formData.use_template}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">Start from scratch</option>
                {templates.map((template: any) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Flex Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flex Date *</label>
            <select
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">Select a date</option>
              {flexDates.map((fd: any) => (
                <option key={fd.id} value={fd.date}>
                  {new Date(fd.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} - {fd.flex_type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Math Tutoring, Study Hall, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              rows={3}
              value={formData.long_description}
              onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
              placeholder="What will students do in this session?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Grades *</label>
            <div className="flex gap-2">
              {[9, 10, 11, 12].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.allowed_grades.includes(grade)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring}
              onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-600"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">
              Create for all future flex dates of this type
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="save_template"
              checked={formData.save_as_template}
              onChange={(e) => setFormData({ ...formData, save_as_template: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-600"
            />
            <label htmlFor="save_template" className="text-sm text-gray-700">
              Save as template
            </label>
          </div>

          {formData.save_as_template && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., My Math Tutoring Session"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Template Modal
function CreateTemplateModal({ teacherId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    room_number: '',
    capacity: 20,
    title: '',
    long_description: '',
    allowed_grades: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);

  function toggleGrade(grade: number) {
    if (formData.allowed_grades.includes(grade)) {
      setFormData({
        ...formData,
        allowed_grades: formData.allowed_grades.filter(g => g !== grade),
      });
    } else {
      setFormData({
        ...formData,
        allowed_grades: [...formData.allowed_grades, grade].sort(),
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (formData.allowed_grades.length === 0) {
      alert('Please select at least one grade');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      
      const { error } = await supabase
        .from('session_templates')
        .insert({
          teacher_id: teacherId,
          ...formData,
        });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Template</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Math Tutoring Template"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Math Tutoring, Study Hall, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              rows={3}
              value={formData.long_description}
              onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
              placeholder="What will students do in this session?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Grades *</label>
            <div className="flex gap-2">
              {[9, 10, 11, 12].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.allowed_grades.includes(grade)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Roster Modal
function RosterModal({ session, onClose, onRemove, onLock }: any) {
  const students = session.registrations || [];
  const lockedCount = students.filter((r: any) => r.status === 'locked').length;
  const selectedCount = students.filter((r: any) => r.status === 'selected').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl m-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{session.title}</h2>
            <p className="text-sm text-gray-600">
              {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • Room {session.room_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{students.length} / {session.capacity}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600">Selected</p>
            <p className="text-2xl font-bold text-blue-900">{selectedCount}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-600">Locked</p>
            <p className="text-2xl font-bold text-amber-900">{lockedCount}</p>
          </div>
        </div>

        {/* Student List */}
        {students.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((registration: any) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{registration.student.name}</p>
                        <p className="text-xs text-gray-600">{registration.student.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Grade {registration.student.grade}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        registration.status === 'locked' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {registration.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {registration.status !== 'locked' && (
                        <button
                          onClick={() => onLock(registration.student.id, session.id)}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          Lock
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(registration.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No students enrolled yet</p>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}