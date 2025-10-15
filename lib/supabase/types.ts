// lib/supabase/types.ts
// TypeScript types for your database tables
// This ensures type safety when working with your data

export type Role = 'student' | 'teacher' | 'admin';
export type FlexType = 'ACCESS' | 'STUDY TIME';
export type RegistrationStatus = 'selected' | 'locked' | 'assigned';
export type NotificationType = 'removed' | 'locked' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  grade?: number;
  homeroom?: string;
  created_at: string;
}

export interface FlexDate {
  id: string;
  date: string;
  flex_type: FlexType;
  duration_minutes: number;
  selection_deadline: string;
  is_locked: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  teacher_id: string;
  room_number: string;
  capacity: number;
  title: string;
  long_description?: string;
  allowed_grades: number[];
  created_from_template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  session_id: string;
  student_id: string;
  date: string;
  status: RegistrationStatus;
  locked_by_teacher_id?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  student_id: string;
  type: NotificationType;
  session_id?: string;
  flex_date?: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SessionTemplate {
  id: string;
  teacher_id: string;
  name: string;
  room_number: string;
  capacity: number;
  title: string;
  long_description?: string;
  allowed_grades: number[];
  created_at: string;
}