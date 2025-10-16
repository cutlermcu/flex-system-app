// app/admin/page.tsx
// Complete Admin Dashboard with all management features

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'flex-dates' | 'users' | 'sessions';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [flexDates, setFlexDates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateFlexModal, setShowCreateFlexModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
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

      if (userData?.role !== 'admin') {
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
      case 'overview':
        await loadStats();
        break;
      case 'flex-dates':
        await loadFlexDates();
        break;
      case 'users':
        await loadUsers();
        break;
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadFlexDates() {
    try {
      const response = await fetch('/api/admin/flex-dates');
      
      // Check if response is ok first
      if (!response.ok) {
        const text = await response.text();
        console.error('API error:', text);
        alert(`Failed to load flex dates: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      setFlexDates(data.flexDates || []);
    } catch (error) {
      console.error('Error loading flex dates:', error);
      alert('Failed to load flex dates. Check console for details.');
    }
  }

  async function loadUsers() {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/users?${params}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('API error:', text);
        return;
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function deleteFlexDate(id: string) {
    if (!confirm('Are you sure you want to delete this flex date? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/flex-dates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadFlexDates();
        alert('Flex date deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete flex date');
      }
    } catch (error) {
      console.error('Error deleting flex date:', error);
      alert('Failed to delete flex date');
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadUsers();
        alert('User deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">Administrator</p>
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
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'flex-dates', label: 'Flex Dates', icon: '📅' },
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'sessions', label: 'Sessions', icon: '🎓' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 font-medium'
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
        {activeTab === 'overview' && stats && (
          <OverviewTab stats={stats} />
        )}

        {activeTab === 'flex-dates' && (
          <FlexDatesTab 
            flexDates={flexDates} 
            onDelete={deleteFlexDate}
            onRefresh={loadFlexDates}
            onCreateNew={() => setShowCreateFlexModal(true)}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab 
            users={users}
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            onSearchChange={setSearchTerm}
            onRoleFilterChange={setRoleFilter}
            onDelete={deleteUser}
            onRefresh={loadUsers}
            onEdit={(user) => {
              setEditingUser(user);
              setShowEditUserModal(true);
            }}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab />
        )}
      </div>

      {/* Modals */}
      {showCreateFlexModal && (
        <CreateFlexDateModal 
          onClose={() => setShowCreateFlexModal(false)}
          onSuccess={() => {
            setShowCreateFlexModal(false);
            loadFlexDates();
          }}
        />
      )}

      {showEditUserModal && editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => {
            setShowEditUserModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowEditUserModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.users.total} icon="👥" color="blue" />
        <StatCard title="Students" value={stats.users.students} icon="🎓" color="emerald" />
        <StatCard title="Teachers" value={stats.users.teachers} icon="👨‍🏫" color="purple" />
        <StatCard title="Upcoming Flex Days" value={stats.flex_dates.upcoming} icon="📅" color="amber" />
      </div>

      {/* Alerts */}
      {(stats.sessions.over_capacity > 0 || stats.sessions.empty > 0 || stats.registrations.students_without_selection > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Alerts & Warnings</h2>
          <div className="space-y-3">
            {stats.registrations.students_without_selection > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 bg-red-600 rounded-full"></div>
                <p className="text-sm text-red-900">
                  <strong>{stats.registrations.students_without_selection} students</strong> haven't selected a session for the next flex date
                </p>
              </div>
            )}
            {stats.sessions.over_capacity > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 bg-amber-600 rounded-full"></div>
                <p className="text-sm text-amber-900">
                  <strong>{stats.sessions.over_capacity} sessions</strong> are over capacity
                </p>
              </div>
            )}
            {stats.sessions.empty > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                <p className="text-sm text-blue-900">
                  <strong>{stats.sessions.empty} sessions</strong> have no students enrolled
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity would go here */}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// Flex Dates Tab Component
function FlexDatesTab({ flexDates, onDelete, onRefresh, onCreateNew }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Flex Dates</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <span>+</span>
          <span>Create Flex Date</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Sessions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Deadline</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flexDates.map((flexDate: any) => (
              <tr key={flexDate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {new Date(flexDate.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    flexDate.flex_type === 'ACCESS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {flexDate.flex_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{flexDate.duration_minutes} min</td>
                <td className="px-6 py-4 text-sm text-gray-600">{flexDate.session_count}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{flexDate.registration_count}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(flexDate.selection_deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onDelete(flexDate.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {flexDates.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No flex dates found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, searchTerm, roleFilter, onSearchChange, onRoleFilterChange, onDelete, onRefresh, onEdit }: any) {
  useEffect(() => {
    onRefresh();
  }, [searchTerm, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <p className="text-xs text-blue-900">
            💡 New users must sign in with Google first, then you can edit their role/grade
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        />
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Grade</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    user.role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                    user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.grade || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No users found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}

// Sessions Tab Component
function SessionsTab() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <p className="text-gray-600">Sessions overview coming soon...</p>
    </div>
  );
}

// Create Flex Date Modal
function CreateFlexDateModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: '',
    flex_type: 'ACCESS',
    duration_minutes: 90,
    selection_deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/flex-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create flex date');
      }
    } catch (error) {
      console.error('Error creating flex date:', error);
      alert('Failed to create flex date');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Flex Date</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flex Type</label>
            <select
              value={formData.flex_type}
              onChange={(e) => setFormData({ ...formData, flex_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            >
              <option value="ACCESS">ACCESS (90 min)</option>
              <option value="STUDY TIME">STUDY TIME (45 min)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selection Deadline</label>
            <input
              type="datetime-local"
              required
              value={formData.selection_deadline}
              onChange={(e) => setFormData({ ...formData, selection_deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal
function EditUserModal({ user, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'student',
    grade: user.grade?.toString() || '',
    homeroom: user.homeroom || '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body: any = {
        name: formData.name,
        role: formData.role,
      };

      if (formData.role === 'student') {
        body.grade = parseInt(formData.grade);
        body.homeroom = formData.homeroom || null;
      } else {
        body.grade = null;
        body.homeroom = null;
      }

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formData.role === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <input
                  type="number"
                  min="9"
                  max="12"
                  required
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Homeroom (optional)</label>
                <input
                  type="text"
                  value={formData.homeroom}
                  onChange={(e) => setFormData({ ...formData, homeroom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </>
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}