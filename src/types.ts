/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'principal' | 'teacher' | 'parent';
export type UserApprovalStatus = 'approved' | 'pending';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserApprovalStatus;
  subject?: string;
  appointedClass?: string; // Class Teacher Appointment, e.g., "Grade 10-A"
  createdAt: string;
}

export interface StudentRecord {
  indexNumber: string; // Unique, e.g., STU-1001
  name: string;
  grade: string; // e.g., Grade 10-A, Grade 11-B
  parentName: string;
  parentContact: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string; // indexNumber_date
  studentId: string;
  studentName: string;
  grade: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string; // Teacher name
  markedAt: string;
}

export interface MarkReport {
  id: string; // studentId_term
  studentId: string;
  studentName: string;
  grade: string;
  term: string; // e.g., "1st Term 2026", "2nd Term 2026"
  subjects: Record<string, number>; // e.g., {"Mathematics": 85, "Science": 90, ...}
  total: number;
  average: number;
  remarks: string;
  updatedAt: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  leaveType: string; // e.g., Sick Lease, Casual Leave, Duty Leave
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  processedBy?: string;
  processedAt?: string;
  pdfGenerated?: boolean;
  createdAt: string;
}

export interface TermSchedule {
  id: string;
  grade: string;
  title: string;
  date: string;
  subject: string;
  details: string;
  publishedAt: string;
}
