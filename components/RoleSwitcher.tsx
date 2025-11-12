// components/RoleSwitcher.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface RoleSwitcherProps {
  currentRole: 'student' | 'teacher' | 'admin';
  userId: string;
}

export default function RoleSwitcher({ currentRole, userId }: RoleSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function switchRole(newRole: 'student' | 'teacher' | 'admin') {
    if (newRole === currentRole) return;

    setSwitching(true);
    try {
      // Update user role in database
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Redirect to the new role's dashboard
      router.push(`/${newRole}`);
      router.refresh();
    } catch (error) {
      console.error('Error switching role:', error);
      alert('Failed to switch role');
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">Quick Switch</label>
      <select
        value={currentRole}
        onChange={(e) => switchRole(e.target.value as 'student' | 'teacher' | 'admin')}
        disabled={switching}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="student">👨‍🎓 Student</option>
        <option value="teacher">👨‍🏫 Teacher</option>
        <option value="admin">⚙️ Admin</option>
      </select>
    </div>
  );
}