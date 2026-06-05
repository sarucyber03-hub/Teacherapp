/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { 
  UserProfile, 
  StudentRecord, 
  AttendanceRecord, 
  MarkReport, 
  LeaveRequest,
  AttendanceStatus,
  LeaveStatus,
  TermSchedule
} from '../types.ts';

// Core Error Handler from firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'guest-session',
      email: auth?.currentUser?.email || 'guest@tharumapuram.lk',
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
    },
    operationType,
    path
  };
  console.warn('Firestore Error caught: ', JSON.stringify(errInfo));
  // Return generic error instead of strictly crashing client so we have a responsive interface
  return new Error(JSON.stringify(errInfo));
}

// Initial Seed Data representation so the app is immediately populated and engaging
const SEED_USERS: UserProfile[] = [
  {
    uid: 'admin',
    name: 'P.Thavanesan (Principal)',
    email: 'admin@tharumapuram.lk',
    role: 'principal',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'teacher1',
    name: 'Mrs. Tharmika Sivakumar',
    email: 'tharmika@tharumapuram.lk',
    role: 'teacher',
    status: 'pending',
    subject: 'Pure Mathematics',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'teacher2',
    name: 'Mr. Jeyakumar Sathanantham',
    email: 'jeyakumar@tharumapuram.lk',
    role: 'teacher',
    status: 'approved',
    subject: 'Science & Technology',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'teacher3',
    name: 'Miss Priyadharshini Kugathas',
    email: 'priya@tharumapuram.lk',
    role: 'teacher',
    status: 'approved',
    subject: 'English Language',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'teacher4',
    name: 'Mr. Mathiyolban Velayutham',
    email: 'mathy@tharumapuram.lk',
    role: 'teacher',
    status: 'pending',
    subject: 'Sri Lankan History',
    createdAt: new Date().toISOString()
  }
];

const SEED_STUDENTS: StudentRecord[] = [
  {
    indexNumber: 'STU202601',
    name: 'Sureshkumar Kobilan',
    grade: 'Grade 10-A',
    parentName: 'Sureshkumar V.',
    parentContact: '+94 77 123 4567',
    createdAt: new Date().toISOString()
  },
  {
    indexNumber: 'STU202602',
    name: 'Sivaruban Abinaya',
    grade: 'Grade 10-A',
    parentName: 'Sivaruban T.',
    parentContact: '+94 77 234 5678',
    createdAt: new Date().toISOString()
  },
  {
    indexNumber: 'STU202603',
    name: 'Raveendran Thanusar',
    grade: 'Grade 11-B',
    parentName: 'Raveendran K.',
    parentContact: '+94 77 345 6789',
    createdAt: new Date().toISOString()
  },
  {
    indexNumber: 'STU202604',
    name: 'Jeyaseelan Niroshini',
    grade: 'Grade 11-B',
    parentName: 'Jeyaseelan S.',
    parentContact: '+94 77 456 7890',
    createdAt: new Date().toISOString()
  },
  {
    indexNumber: 'STU202605',
    name: 'Balachandran Sanjayan',
    grade: 'Grade 10-A',
    parentName: 'Balachandran M.',
    parentContact: '+94 77 567 8901',
    createdAt: new Date().toISOString()
  }
];

const SEED_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LV-101',
    teacherId: 'teacher2',
    teacherName: 'Mr. Jeyakumar Sathanantham',
    leaveType: 'Medical Sick Leave',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    reason: 'Severe throat infection, specialist medical officer recommended voice rest.',
    status: 'approved',
    processedBy: 'admin',
    processedAt: new Date().toISOString(),
    pdfGenerated: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'LV-102',
    teacherId: 'teacher3',
    teacherName: 'Miss Priyadharshini Kugathas',
    leaveType: 'Casual Personal Leave',
    startDate: '2026-06-12',
    endDate: '2026-06-13',
    reason: 'Family cultural celebration event in Vavuniya Temple.',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const SEED_REPORTS: MarkReport[] = [
  {
    id: 'STU202601_TERM1',
    studentId: 'STU202601',
    studentName: 'Sureshkumar Kobilan',
    grade: 'Grade 10-A',
    term: '1st Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 85,
      'Science & Technology': 92,
      'English Language': 78,
      'Tamil Language': 88,
      'Sri Lankan History': 82
    },
    total: 425,
    average: 85.0,
    remarks: 'Outstanding dedication shown. Extremely analytical mindset!',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202601_TERM2',
    studentId: 'STU202601',
    studentName: 'Sureshkumar Kobilan',
    grade: 'Grade 10-A',
    term: '2nd Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 90,
      'Science & Technology': 95,
      'English Language': 80,
      'Tamil Language': 92,
      'Sri Lankan History': 83
    },
    total: 440,
    average: 88.0,
    remarks: 'Continued excellence. Gained higher fluency in historical essays.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202601_TERM3',
    studentId: 'STU202601',
    studentName: 'Sureshkumar Kobilan',
    grade: 'Grade 10-A',
    term: 'Final Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 95,
      'Science & Technology': 96,
      'English Language': 85,
      'Tamil Language': 94,
      'Sri Lankan History': 85
    },
    total: 455,
    average: 91.0,
    remarks: 'Outstanding term! Reached distinction standard across all key Sri Lankan curriculum courses.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202602_TERM1',
    studentId: 'STU202602',
    studentName: 'Sivaruban Abinaya',
    grade: 'Grade 10-A',
    term: '1st Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 72,
      'Science & Technology': 80,
      'English Language': 84,
      'Tamil Language': 90,
      'Sri Lankan History': 76
    },
    total: 402,
    average: 80.4,
    remarks: 'Consistent student. Commendable improvement in science practical lessons.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202602_TERM2',
    studentId: 'STU202602',
    studentName: 'Sivaruban Abinaya',
    grade: 'Grade 10-A',
    term: '2nd Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 78,
      'Science & Technology': 82,
      'English Language': 86,
      'Tamil Language': 92,
      'Sri Lankan History': 80
    },
    total: 418,
    average: 83.6,
    remarks: 'Clear rise in mathematical scoring and active classroom participation.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202602_TERM3',
    studentId: 'STU202602',
    studentName: 'Sivaruban Abinaya',
    grade: 'Grade 10-A',
    term: 'Final Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 85,
      'Science & Technology': 86,
      'English Language': 88,
      'Tamil Language': 94,
      'Sri Lankan History': 82
    },
    total: 435,
    average: 87.0,
    remarks: 'Superb final evaluation! Highly passionate about languages and scientific inquiries.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202603_TERM1',
    studentId: 'STU202603',
    studentName: 'Raveendran Thanusar',
    grade: 'Grade 11-B',
    term: '1st Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 94,
      'Science & Technology': 88,
      'English Language': 72,
      'Tamil Language': 85,
      'Sri Lankan History': 79
    },
    total: 418,
    average: 83.6,
    remarks: 'Brilliant mathematical scores. Keep practicing English grammar exercises.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202603_TERM2',
    studentId: 'STU202603',
    studentName: 'Raveendran Thanusar',
    grade: 'Grade 11-B',
    term: '2nd Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 96,
      'Science & Technology': 90,
      'English Language': 75,
      'Tamil Language': 86,
      'Sri Lankan History': 81
    },
    total: 428,
    average: 85.6,
    remarks: 'Excellent math standards. English showing positive feedback loops.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'STU202603_TERM3',
    studentId: 'STU202603',
    studentName: 'Raveendran Thanusar',
    grade: 'Grade 11-B',
    term: 'Final Term Evaluation 2026',
    subjects: {
      'Pure Mathematics': 98,
      'Science & Technology': 92,
      'English Language': 78,
      'Tamil Language': 88,
      'Sri Lankan History': 82
    },
    total: 438,
    average: 87.6,
    remarks: 'Very strong performance overall. Promising candidate for OL examination prep.',
    updatedAt: new Date().toISOString()
  }
];

// In-Memory Storage to act as local fallback and quick seed merged layer
class LocalSchoolStorage {
  users: Map<string, UserProfile> = new Map();
  students: Map<string, StudentRecord> = new Map();
  attendance: Map<string, AttendanceRecord> = new Map();
  markReports: Map<string, MarkReport> = new Map();
  leaveRequests: Map<string, LeaveRequest> = new Map();

  constructor() {
    // Check if the storage exists in localstorage to survive reloads, otherwise load seeds
    const localData = localStorage.getItem('tharumapuram_college_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        parsed.users?.forEach((u: UserProfile) => this.users.set(u.uid, u));
        parsed.students?.forEach((s: StudentRecord) => this.students.set(s.indexNumber, s));
        parsed.attendance?.forEach((a: AttendanceRecord) => this.attendance.set(a.id, a));
        parsed.markReports?.forEach((m: MarkReport) => this.markReports.set(m.id, m));
        parsed.leaveRequests?.forEach((l: LeaveRequest) => this.leaveRequests.set(l.id, l));
        return;
      } catch (e) {
        console.error('Error loading localStorage data, re-seeding', e);
      }
    }
    this.seed();
  }

  seed() {
    SEED_USERS.forEach(u => this.users.set(u.uid, u));
    SEED_STUDENTS.forEach(s => this.students.set(s.indexNumber, s));
    SEED_LEAVE_REQUESTS.forEach(l => this.leaveRequests.set(l.id, l));
    SEED_REPORTS.forEach(r => this.markReports.set(r.id, r));
    this.saveToDisk();
  }

  saveToDisk() {
    const data = {
      users: Array.from(this.users.values()),
      students: Array.from(this.students.values()),
      attendance: Array.from(this.attendance.values()),
      markReports: Array.from(this.markReports.values()),
      leaveRequests: Array.from(this.leaveRequests.values()),
    };
    localStorage.setItem('tharumapuram_college_data', JSON.stringify(data));
  }
}

export const localDB = new LocalSchoolStorage();

// FIRESTORE SYNC AND HELPERS (Dual-write methodology)

/**
 * Sync Local User to Firestore and return UserProfile
 */
export async function syncUserToFirestore(profile: UserProfile): Promise<UserProfile> {
  // Update Local map first
  localDB.users.set(profile.uid, profile);
  localDB.saveToDisk();

  try {
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, profile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
  }

  return profile;
}

/**
 * Get User Profile
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // Check memory/local first
  const localUser = localDB.users.get(uid);

  try {
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as UserProfile;
      localDB.users.set(uid, data);
      localDB.saveToDisk();
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  return localUser || null;
}

/**
 * Retrieve All Users / Teacher Approvals
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, 'users');
    const qSnapshot = await getDocs(usersCollection);
    const users: UserProfile[] = [];
    qSnapshot.forEach((docSnap) => {
      users.push(docSnap.data() as UserProfile);
    });
    if (users.length > 0) {
      // update local
      users.forEach(u => localDB.users.set(u.uid, u));
      localDB.saveToDisk();
      return users;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  return Array.from(localDB.users.values());
}

/**
 * Approve a Teacher's Registration State
 */
export async function approveTeacherRegistration(teacherUid: string, approvedBy: string): Promise<boolean> {
  const teacher = localDB.users.get(teacherUid);
  if (teacher) {
    teacher.status = 'approved';
    localDB.users.set(teacherUid, teacher);
    localDB.saveToDisk();
  }

  try {
    const userDocRef = doc(db, 'users', teacherUid);
    await updateDoc(userDocRef, { status: 'approved' });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${teacherUid}`);
    // If firestore fails we can still succeed locally for demo/mock sandbox
    return true;
  }
}

/**
 * Appoint a class to a Teacher directly
 */
export async function appointTeacherClass(teacherUid: string, className: string): Promise<boolean> {
  const teacher = localDB.users.get(teacherUid);
  if (teacher) {
    teacher.appointedClass = className;
    localDB.users.set(teacherUid, teacher);
    localDB.saveToDisk();
  }

  try {
    const userDocRef = doc(db, 'users', teacherUid);
    await updateDoc(userDocRef, { appointedClass: className });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${teacherUid}`);
    return true;
  }
}

/**
 * Register a teacher profile directly by Principal
 */
export async function principalAddTeacher(profile: UserProfile): Promise<boolean> {
  localDB.users.set(profile.uid, profile);
  localDB.saveToDisk();

  try {
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, profile);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
    return true;
  }
}

/**
 * Retrieve All Students
 */
export async function getAllStudents(): Promise<StudentRecord[]> {
  try {
    const studentsCol = collection(db, 'students');
    const snapshot = await getDocs(studentsCol);
    const list: StudentRecord[] = [];
    snapshot.forEach((item) => list.push(item.data() as StudentRecord));
    if (list.length > 0) {
      list.forEach(s => localDB.students.set(s.indexNumber, s));
      localDB.saveToDisk();
      return list;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'students');
  }

  return Array.from(localDB.students.values());
}

/**
 * Write/Save or Edit a Student Record
 */
export async function saveStudentRecord(student: StudentRecord): Promise<StudentRecord> {
  localDB.students.set(student.indexNumber, student);
  localDB.saveToDisk();

  try {
    const sDocRef = doc(db, 'students', student.indexNumber);
    await setDoc(sDocRef, student);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `students/${student.indexNumber}`);
  }
  return student;
}

/**
 * Get Single Student Details by Index Number or Name
 */
export async function getStudentByIndex(indexNumber: string): Promise<StudentRecord | null> {
  const localStu = localDB.students.get(indexNumber.toUpperCase().trim());
  if (localStu) return localStu;

  try {
    const sDocRef = doc(db, 'students', indexNumber.toUpperCase().trim());
    const snap = await getDoc(sDocRef);
    if (snap.exists()) {
      return snap.data() as StudentRecord;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `students/${indexNumber}`);
  }
  return null;
}

/**
 * Mark/Save Attendance Record in Batch
 */
export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  records.forEach(rec => {
    localDB.attendance.set(rec.id, rec);
  });
  localDB.saveToDisk();

  for (const rec of records) {
    try {
      const aDocRef = doc(db, 'attendance', rec.id);
      await setDoc(aDocRef, rec);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${rec.id}`);
    }
  }
}

/**
 * Retrieve Attendance Records
 */
export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, 'attendance');
    const snapshot = await getDocs(colRef);
    const list: AttendanceRecord[] = [];
    snapshot.forEach(item => list.push(item.data() as AttendanceRecord));
    if (list.length > 0) {
      list.forEach(item => localDB.attendance.set(item.id, item));
      localDB.saveToDisk();
      return list;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'attendance');
  }

  return Array.from(localDB.attendance.values());
}

/**
 * Fetch Academic Mark Report for entered child Index Number
 */
export async function getMarkReportsByIndex(studentIndex: string): Promise<MarkReport[]> {
  const index = studentIndex.toUpperCase().trim();
  const memoryReports = Array.from(localDB.markReports.values()).filter(
    r => r.studentId.toUpperCase().trim() === index
  );

  try {
    const collectionRef = collection(db, 'markReports');
    const q = query(collectionRef, where('studentId', '==', index));
    const snapshot = await getDocs(q);
    const list: MarkReport[] = [];
    snapshot.forEach(docSnap => list.push(docSnap.data() as MarkReport));
    if (list.length > 0) {
      list.forEach(r => localDB.markReports.set(r.id, r));
      localDB.saveToDisk();
      return list;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `markReports?studentId=${index}`);
  }

  return memoryReports;
}

/**
 * Save / Update Student Mark Report
 */
export async function saveMarkReport(report: MarkReport): Promise<MarkReport> {
  localDB.markReports.set(report.id, report);
  localDB.saveToDisk();

  try {
    const rDocRef = doc(db, 'markReports', report.id);
    await setDoc(rDocRef, report);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `markReports/${report.id}`);
  }
  return report;
}

/**
 * Submit a Lesson Teacher Leave Request
 */
export async function submitLeaveRequest(req: LeaveRequest): Promise<LeaveRequest> {
  localDB.leaveRequests.set(req.id, req);
  localDB.saveToDisk();

  try {
    const lDocRef = doc(db, 'leaveRequests', req.id);
    await setDoc(lDocRef, req);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `leaveRequests/${req.id}`);
  }
  return req;
}

/**
 * Fetch All Leave Requests
 */
export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const colRef = collection(db, 'leaveRequests');
    const snap = await getDocs(colRef);
    const list: LeaveRequest[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as LeaveRequest));
    if (list.length > 0) {
      list.forEach(item => localDB.leaveRequests.set(item.id, item));
      localDB.saveToDisk();
      return list;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'leaveRequests');
  }

  return Array.from(localDB.leaveRequests.values());
}

/**
 * Process/Approve Leave Requests and update state
 */
export async function processLeaveRequestStatus(
  requestId: string, 
  status: LeaveStatus, 
  principalUid: string
): Promise<LeaveRequest | null> {
  const req = localDB.leaveRequests.get(requestId);
  if (req) {
    req.status = status;
    req.processedBy = principalUid;
    req.processedAt = new Date().toISOString();
    if (status === 'approved') {
      req.pdfGenerated = true;
    }
    localDB.leaveRequests.set(requestId, req);
    localDB.saveToDisk();
  }

  try {
    const docRef = doc(db, 'leaveRequests', requestId);
    const updates: Partial<LeaveRequest> = {
      status,
      processedBy: principalUid,
      processedAt: new Date().toISOString(),
    };
    if (status === 'approved') {
      updates.pdfGenerated = true;
    }
    await updateDoc(docRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `leaveRequests/${requestId}`);
  }

  return req || null;
}

/**
 * Delete a teacher from database and local memory
 */
export async function deleteTeacher(teacherUid: string): Promise<boolean> {
  // Update local memory and disk fallback
  localDB.users.delete(teacherUid);
  localDB.saveToDisk();

  try {
    const docRef = doc(db, 'users', teacherUid);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${teacherUid}`);
  }
  return true;
}

/**
 * Save Term Schedule Announcement
 */
export async function saveTermSchedule(schedule: TermSchedule): Promise<TermSchedule> {
  // also merge into localStorage fallback disk write
  const saved = localStorage.getItem('tharumapuram_college_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.schedules) parsed.schedules = [];
      // remove old one if exists with same ID
      parsed.schedules = parsed.schedules.filter((s: any) => s.id !== schedule.id);
      parsed.schedules.push(schedule);
      localStorage.setItem('tharumapuram_college_data', JSON.stringify(parsed));
    } catch(e) {
      console.error(e);
    }
  }

  try {
    const docRef = doc(db, 'termSchedules', schedule.id);
    await setDoc(docRef, schedule);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `termSchedules/${schedule.id}`);
  }

  return schedule;
}

/**
 * Fetch Term Schedules for a Grade
 */
export async function getTermSchedulesByGrade(grade: string): Promise<TermSchedule[]> {
  // Check memory/localstorage
  let localSchedules: TermSchedule[] = [];
  const saved = localStorage.getItem('tharumapuram_college_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.schedules) {
        localSchedules = parsed.schedules.filter((s: any) => s.grade === grade);
      }
    } catch (e) {
      console.error(e);
    }
  }

  try {
    const colRef = collection(db, 'termSchedules');
    const q = query(colRef, where('grade', '==', grade));
    const snapshot = await getDocs(q);
    const list: TermSchedule[] = [];
    snapshot.forEach(docSnap => list.push(docSnap.data() as TermSchedule));
    if (list.length > 0) {
      return list;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'termSchedules');
  }

  return localSchedules;
}
