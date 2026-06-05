/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getAllUsers, 
  approveTeacherRegistration, 
  getAllAttendanceRecords, 
  getAllStudents,
  getAllLeaveRequests,
  processLeaveRequestStatus,
  deleteTeacher,
  appointTeacherClass,
  principalAddTeacher
} from '../lib/schoolData.ts';
import { UserProfile, StudentRecord, AttendanceRecord, LeaveRequest } from '../types.ts';
import { 
  Users, 
  ClipboardCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download, 
  Calendar,
  AlertCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'teachers' | 'attendance' | 'leaves'>('teachers');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Teacher creation states
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    subject: 'Pure Mathematics',
    appointedClass: 'None',
    password: 'teacher123'
  });

  // Deletion protective confirm states
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Stats calculation
  const [stats, setStats] = useState({
    totalTeachers: 0,
    pendingApprovals: 0,
    totalStudents: 0,
    todayAttendanceRate: 100,
    pendingLeaves: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allStus, allAtt, allLeaves] = await Promise.all([
        getAllUsers(),
        getAllStudents(),
        getAllAttendanceRecords(),
        getAllLeaveRequests()
      ]);

      const teacherList = allUsers.filter(u => u.role === 'teacher');
      setTeachers(teacherList);
      setStudents(allStus);
      setAttendance(allAtt);
      setLeaveRequests(allLeaves);

      // Calculations
      const pendingT = teacherList.filter(t => t.status === 'pending').length;
      const leavesP = allLeaves.filter(l => l.status === 'pending').length;
      
      // Calculate attendance rate (latest marked date)
      const uniqueDates = [...new Set(allAtt.map(a => a.date))].sort().reverse();
      let attRate = 100;
      if (uniqueDates.length > 0) {
        const latestDate = uniqueDates[0];
        const latestAtts = allAtt.filter(a => a.date === latestDate);
        const presents = latestAtts.filter(a => a.status === 'present' || a.status === 'late').length;
        if (latestAtts.length > 0) {
          attRate = Math.round((presents / latestAtts.length) * 100);
        }
      }

      setStats({
        totalTeachers: teacherList.length,
        pendingApprovals: pendingT,
        totalStudents: allStus.length,
        todayAttendanceRate: attRate,
        pendingLeaves: leavesP
      });
    } catch (e) {
      console.error('Error loading Principal statistics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleCreateTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name || !newTeacher.email) {
      alert('Teacher Name and Email account are required.');
      return;
    }
    try {
      const generatedUid = 'teach_' + Date.now().toString(36);
      const newProfile: UserProfile = {
        uid: generatedUid,
        name: newTeacher.name,
        email: newTeacher.email,
        role: 'teacher',
        status: 'approved', // Approved immediately as created by principal
        subject: newTeacher.subject,
        appointedClass: newTeacher.appointedClass === 'None' ? undefined : newTeacher.appointedClass,
        createdAt: new Date().toISOString()
      };
      
      await principalAddTeacher(newProfile);
      triggerNotification(`New Teacher ${newTeacher.name} Appointed and Registered Directly!`);
      setShowAddTeacher(false);
      setNewTeacher({
        name: '',
        email: '',
        subject: 'Pure Mathematics',
        appointedClass: 'None',
        password: 'teacher123'
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppointClass = async (teacherUid: string, className: string) => {
    try {
      const dbClassName = className === 'None' ? '' : className;
      await appointTeacherClass(teacherUid, dbClassName);
      triggerNotification(`Teacher appointed class status updated successfully!`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveTeacher = async (teacherUid: string, teacherName: string) => {
    try {
      await approveTeacherRegistration(teacherUid, user?.uid || 'admin');
      triggerNotification(`Teacher ${teacherName} registration approved successfully!`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTeacher = async (teacherUid: string, teacherName: string) => {
    try {
      await deleteTeacher(teacherUid);
      triggerNotification(`Teacher ${teacherName} registry access revoked and removed successfully!`);
      setConfirmingDeleteId(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcessLeave = async (requestId: string, approveState: 'approved' | 'rejected', leave: LeaveRequest) => {
    try {
      await processLeaveRequestStatus(requestId, approveState, user?.uid || 'admin');
      
      if (approveState === 'approved') {
        triggerNotification(`Leave approved. Official Leave Certificate PDF generated!`);
        generateLeaveCertificatePDF(leave);
      } else {
        triggerNotification(`Leave request declined.`);
      }
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // AUTOMATIC HIGH-QUALITY LEAVE PDF GENERATOR
  const generateLeaveCertificatePDF = (leave: LeaveRequest) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Decorative Borders (Burgundy & Gold Theme representing school)
    doc.setDrawColor(78, 52, 46); // Brown border
    doc.setLineWidth(1.5);
    doc.rect(8, 8, 194, 281);

    doc.setDrawColor(218, 165, 32); // Gold inner border
    doc.setLineWidth(0.5);
    doc.rect(11, 11, 188, 275);

    // 2. Official Header
    doc.setFillColor(78, 52, 46);
    doc.rect(12, 12, 186, 28, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Kn/THARUMAPURAM CENTRAL COLLEGE', 105, 21, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text('Kilinochchi, Northern Province, Sri Lanka | Email: info@tharumapuram.lk', 105, 28, { align: 'center' });
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('"Education to Live Exceptionally" - Official Institutional Directorate', 105, 34, { align: 'center' });

    // 3. Document Title
    doc.setTextColor(78, 52, 46);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('OFFICIAL LEAVE APPROVAL CERTIFICATE', 105, 58, { align: 'center' });

    // Ornamental Divider
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(1);
    doc.line(40, 64, 170, 64);
    doc.circle(105, 64, 1.5, 'FD');

    // 4. Meta Certificate Info Box
    doc.setFillColor(248, 249, 250);
    doc.rect(15, 75, 180, 28, 'F');
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.5);
    doc.rect(15, 75, 180, 28);

    doc.setTextColor(51, 51, 51);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Certificate ID:', 20, 83);
    doc.setFont('Helvetica', 'normal');
    doc.text(`TCC-LV-${leave.id}`, 50, 83);

    doc.setFont('Helvetica', 'bold');
    doc.text('Date of Issue:', 20, 93);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { dateStyle: 'long' }), 50, 93);

    doc.setFont('Helvetica', 'bold');
    doc.text('State Registry:', 115, 83);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(40, 167, 69);
    doc.text('VERIFIED & REGULATED', 145, 83);

    doc.setTextColor(51, 51, 51);
    doc.setFont('Helvetica', 'bold');
    doc.text('Approved By:', 115, 93);
    doc.setFont('Helvetica', 'normal');
    doc.text('P.Thavanesan (Principal)', 145, 93);

    // 5. Leave Information Text Details
    doc.setTextColor(33, 37, 41);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    
    let textY = 120;
    doc.setFont('Helvetica', 'bold');
    doc.text('Recipient Teacher:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(leave.teacherName, 60, textY);
    
    textY += 12;
    doc.setFont('Helvetica', 'bold');
    doc.text('Teacher Registry UID:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(leave.teacherId.substring(0, 8).toUpperCase(), 60, textY);

    textY += 12;
    doc.setFont('Helvetica', 'bold');
    doc.text('Leave Category:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(leave.leaveType, 60, textY);

    textY += 12;
    doc.setFont('Helvetica', 'bold');
    doc.text('Effective Commencing Date:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(leave.startDate).toLocaleDateString('en-US', { dateStyle: 'medium' }), 60, textY);

    textY += 12;
    doc.setFont('Helvetica', 'bold');
    doc.text('Effective Concluding Date:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(leave.endDate).toLocaleDateString('en-US', { dateStyle: 'medium' }), 60, textY);

    // Calculate duration
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    textY += 12;
    doc.setFont('Helvetica', 'bold');
    doc.text('Total Covered Duration:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${diffDays} Academic Day(s)`, 60, textY);

    textY += 15;
    doc.setFont('Helvetica', 'bold');
    doc.text('Justified Ground / Reason:', 15, textY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    
    const splitReason = doc.splitTextToSize(leave.reason, 175);
    doc.text(splitReason, 15, textY + 8);

    // 6. Institutional declaration statement
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 110, 120);
    const declaration = "This leave application has been formally assessed against the institutional guidelines of Kn/Tharumapuram Central College. Upon approval, the class duties, lessons, and student evaluations have been properly delegated to alternative academic staff. Hence, the administration officially registers the absence of the recipient teacher as an approved leaves.";
    const splitDecl = doc.splitTextToSize(declaration, 180);
    doc.text(splitDecl, 15, 215);

    // 7. Signature area
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 255, 75, 255);
    doc.line(135, 255, 195, 255);

    doc.setTextColor(110, 120, 130);
    doc.setFontSize(9);
    doc.text("Teacher's Signature", 45, 260, { align: 'center' });
    doc.text("Principal's Sign & Seal", 165, 260, { align: 'center' });

    // Mock Principal Sig Initials
    doc.setFont('Courier', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(78, 52, 46);
    doc.text('P.Thavanesan', 165, 250, { align: 'center' });

    // Download the PDF
    doc.save(`Leave_Approval_${leave.teacherName.replace(/\s+/g, '_')}_TCC-${leave.id}.pdf`);
  };

  // Group attendance by class for analytics
  const getAttendanceAnalytics = () => {
    const grades = [...new Set(students.map(s => s.grade))];
    return grades.map(g => {
      const classStus = students.filter(s => s.grade === g);
      const classStuIds = classStus.map(s => s.indexNumber);
      
      const classAtt = attendance.filter(a => classStuIds.includes(a.studentId));
      if (classAtt.length === 0) {
        return { grade: g, attendanceRate: 100, present: 0, absent: 0 };
      }
      const present = classAtt.filter(a => a.status === 'present' || a.status === 'late').length;
      const absent = classAtt.filter(a => a.status === 'absent').length;
      return {
        grade: g,
        attendanceRate: Math.round((present / classAtt.length) * 100),
        present,
        absent
      };
    });
  };

  const classStats = getAttendanceAnalytics();

  return (
    <div id="principal_portal_view" className="space-y-8 animate-fade-in">
      {/* Visual Header Banner */}
      <div className="relative overflow-hidden bg-radial from-slate-800 to-slate-950 text-white rounded-3xl p-8 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C59B27]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C59B27]/15 border border-[#C59B27]/30 text-amber-200 text-xs font-semibold tracking-wider uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Administrative Registry
            </div>
            <h1 id="principal_welcome_heading" className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white leading-tight">
              Hon. P.Thavanesan
            </h1>
            <p className="text-slate-400 text-sm max-w-lg md:max-w-xl font-sans">
              Welcome back to your principal central command desk. Oversee, approve, certificate and monitor institutional records of the historic Tharumapuram College.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
            <GraduationCap className="w-10 h-10 text-amber-500" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Academic Year</p>
              <p className="font-bold text-sm text-slate-200">2026 / 2027 Term</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Staff Strength</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{stats.totalTeachers}</h3>
            <p className="text-xs text-indigo-500 font-medium">Teachers Registered</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Pending Approvals</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-amber-600">{stats.pendingApprovals}</h3>
            <p className="text-xs text-amber-600 font-medium font-sans">Awaiting Verification</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Roll Roster</span>
            <BookOpen className="w-5 h-5 text-teal-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{stats.totalStudents}</h3>
            <p className="text-xs text-teal-500 font-medium font-sans">Active Students</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Attendance Rate</span>
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-emerald-600">{stats.todayAttendanceRate}%</h3>
            <p className="text-xs text-emerald-600 font-medium">Latest Day Ratio</p>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-50/40 to-amber-100/40 border border-amber-200/44 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4E342E] uppercase tracking-wider font-mono">Leave Queries</span>
            <FileText className="w-5 h-5 text-[#4E342E]" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-[#4E342E]">{stats.pendingLeaves}</h3>
            <p className="text-xs text-[#4E342E]/70 font-medium">Pending Certificates</p>
          </div>
        </div>
      </div>

      {/* Action Notification Alert Toast */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 animate-slide-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">{actionSuccess}</p>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          id="btn_tab_teachers"
          onClick={() => setActiveTab('teachers')}
          className={`pb-4 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === 'teachers'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Teacher Registrations ({stats.pendingApprovals})
        </button>
        <button
          id="btn_tab_attendance"
          onClick={() => setActiveTab('attendance')}
          className={`pb-4 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === 'attendance'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Check Class Attendance
        </button>
        <button
          id="btn_tab_leaves"
          onClick={() => setActiveTab('leaves')}
          className={`pb-4 px-1 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === 'leaves'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Teacher Leave Requests ({stats.pendingLeaves})
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#C59B27] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-slate-400">Fetching administrative database...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: TEACHER REGISTRATION APPROVALS */}
            {activeTab === 'teachers' && (
              <div id="tab_teachers_view" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-slate-900">Registered Teacher Roster</h2>
                    <p className="text-xs text-slate-400">Review teacher sign-up applications and grant access to the teacher mark-book and attendance logs.</p>
                  </div>
                  <button
                    id="btn_add_teacher_modal"
                    onClick={() => setShowAddTeacher(true)}
                    className="inline-flex items-center gap-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm cursor-pointer transition-all self-start sm:self-auto"
                  >
                    Add & Appoint New Teacher
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 text-xs font-mono uppercase tracking-widest pb-3">
                        <th className="py-3 px-4">FullName</th>
                        <th className="py-3 px-4">Email Account</th>
                        <th className="py-3 px-4">Taught Subject</th>
                        <th className="py-3 px-4">Appointed Class Teacher</th>
                        <th className="py-3 px-4">Status Portal</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teach) => (
                        <tr key={teach.uid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-sm">
                          <td className="py-4 px-4 font-semibold text-slate-800">{teach.name}</td>
                          <td className="py-4 px-4 text-slate-600 font-mono text-xs">{teach.email}</td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                              {teach.subject || 'All Curriculum'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              id={`appoint_select_${teach.uid}`}
                              value={teach.appointedClass || 'None'}
                              onChange={(e) => handleAppointClass(teach.uid, e.target.value)}
                              className="bg-white border border-slate-200 text-xs rounded-lg p-1.5 focus:ring-[#C59B27] focus:border-[#C59B27] text-slate-700 font-semibold cursor-pointer"
                            >
                              <option value="None">Not Appointed</option>
                              <option value="Grade 10-A">Grade 10-A</option>
                              <option value="Grade 11-B">Grade 11-B</option>
                              <option value="Grade 12-C">Grade 12-C</option>
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            {teach.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Approved Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pending Review
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-3 font-sans">
                              {teach.status === 'pending' ? (
                                <button
                                  id={`btn_approve_${teach.uid}`}
                                  onClick={() => handleApproveTeacher(teach.uid, teach.name)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-medium">Approved</span>
                              )}

                              {confirmingDeleteId === teach.uid ? (
                                <div className="flex items-center gap-1.5 animate-pulse bg-rose-50 border border-rose-200 p-1 rounded-xl">
                                  <span className="text-[10px] text-rose-700 font-bold px-1.5">Sure?</span>
                                  <button
                                    id={`btn_delete_confirm_${teach.uid}`}
                                    onClick={() => handleDeleteTeacher(teach.uid, teach.name)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-transform cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    id={`btn_delete_cancel_${teach.uid}`}
                                    onClick={() => setConfirmingDeleteId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-transform cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  id={`btn_delete_init_${teach.uid}`}
                                  onClick={() => setConfirmingDeleteId(teach.uid)}
                                  className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Teacher"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {teachers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">No registered teachers found in Tharumapuram College system.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MODAL WINDOW FOR DIRECT NEW TEACHER CREATION */}
                {showAddTeacher && (
                  <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in font-sans">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="font-serif font-bold text-slate-900 text-lg animate-fade-in">Appoint & Register Teacher</h3>
                        <button
                          onClick={() => setShowAddTeacher(false)}
                          className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-100 px-2 py-1 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs font-semibold text-slate-500">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="teach_form_name">Teacher Full Name *</label>
                          <input
                            id="teach_form_name"
                            type="text"
                            required
                            placeholder="e.g. Mrs. Rajeshwary Sivanandan"
                            value={newTeacher.name}
                            onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-slate-700 text-xs font-medium"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="teach_form_email">Email Account *</label>
                          <input
                            id="teach_form_email"
                            type="email"
                            required
                            placeholder="e.g. rajeshwary@tharumapuram.lk"
                            value={newTeacher.email}
                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-slate-700 text-xs font-medium"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="teach_form_subject">Core Subjects Specialty *</label>
                          <select
                            id="teach_form_subject"
                            value={newTeacher.subject}
                            onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-slate-700 text-xs font-medium"
                          >
                            <option value="Pure Mathematics">Pure Mathematics</option>
                            <option value="Science & Technology">Science & Technology</option>
                            <option value="English Language">English Language</option>
                            <option value="Tamil Language">Tamil Language</option>
                            <option value="Sri Lankan History">Sri Lankan History</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="teach_form_class">Class Teacher Appointment</label>
                          <select
                            id="teach_form_class"
                            value={newTeacher.appointedClass}
                            onChange={(e) => setNewTeacher({ ...newTeacher, appointedClass: e.target.value })}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-slate-700 text-xs font-medium"
                          >
                            <option value="None">Not Appointed (Subject Teacher)</option>
                            <option value="Grade 10-A">Class Teacher for Grade 10-A</option>
                            <option value="Grade 11-B">Class Teacher for Grade 11-B</option>
                            <option value="Grade 12-C">Class Teacher for Grade 12-C</option>
                          </select>
                        </div>

                        <div className="pt-2 flex gap-3 text-sm font-bold">
                          <button
                            type="button"
                            onClick={() => setShowAddTeacher(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs cursor-pointer"
                          >
                            Save & Appoint
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CLASS ATTENDANCE MONITORING */}
            {activeTab === 'attendance' && (
              <div id="tab_attendance_view" className="space-y-8">
                <div>
                  <h2 className="text-xl font-serif font-bold text-slate-900">Academic Attendance Monitor</h2>
                  <p className="text-xs text-slate-400">Classroom ratios and student daily registers retrieved from teacher rosters.</p>
                </div>

                {/* Grid of Class Ratios */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classStats.map(item => (
                    <div key={item.grade} className="border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-serif font-bold text-lg text-slate-900">{item.grade}</h4>
                        <span className="text-xs font-mono font-bold text-[#4E342E] px-2 py-1 rounded-lg bg-amber-50">{item.attendanceRate}% Present</span>
                      </div>
                      
                      {/* Interactive Custom SVG Circular Progress Ring */}
                      <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="32" className="stroke-slate-100 fill-none" strokeWidth="6" />
                            <circle 
                              cx="40" 
                              cy="40" 
                              r="32" 
                              className="stroke-[#C59B27] fill-none transition-all duration-1000" 
                              strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 32}`}
                              strokeDashoffset={`${2 * Math.PI * 32 * (1 - item.attendanceRate / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-slate-800">{item.attendanceRate}%</span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-500 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded bg-[#C59B27]"></span>
                            <span>Present/Late: <strong>{item.present}</strong> students</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200"></span>
                            <span>Absent: <strong>{item.absent}</strong> students</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Logs lists */}
                <div className="border border-slate-50 p-6 rounded-2xl bg-slate-50/20">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">Live Daily Attendance Logs</h3>
                  {attendance.length === 0 ? (
                    <p className="text-center text-xs py-8 text-slate-400">Class details are currently blank. No teacher marked attendance registries yet today.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 pb-3 text-slate-400">
                            <th className="py-2">Student Index</th>
                            <th className="py-2">Student Name</th>
                            <th className="py-2">Grade</th>
                            <th className="py-2">Registry Date</th>
                            <th className="py-2">Attendance State</th>
                            <th className="py-2">Authorizing Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.slice().reverse().map(att => (
                            <tr key={att.id} className="border-b border-slate-50 hover:bg-slate-50/40 font-medium">
                              <td className="py-3 font-mono text-slate-700">{att.studentId}</td>
                              <td className="py-3 text-slate-800 font-semibold">{att.studentName}</td>
                              <td className="py-3 text-slate-600">{att.grade}</td>
                              <td className="py-3 font-mono">{att.date}</td>
                              <td className="py-3">
                                {att.status === 'present' && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wide">Present</span>
                                )}
                                {att.status === 'late' && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold uppercase tracking-wide">Late Entry</span>
                                )}
                                {att.status === 'absent' && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold uppercase tracking-wide">Absent</span>
                                )}
                              </td>
                              <td className="py-3 font-medium text-slate-500">{att.markedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LEAVE PROCESSING & AUTOMATIC PDF GENERATION */}
            {activeTab === 'leaves' && (
              <div id="tab_leaves_view" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-slate-900">Academic Leave & Certifications</h2>
                    <p className="text-xs text-slate-400">Review teacher absence reasons. Approved leave requests trigger instant digital PDF certificate processing.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {leaveRequests.map((leave) => (
                    <div 
                      key={leave.id} 
                      className={`border p-6 rounded-2xl flex flex-col lg:flex-row gap-6 justify-between transform transition duration-300 ${
                        leave.status === 'approved' 
                          ? 'border-emerald-100 bg-emerald-50/10' 
                          : leave.status === 'rejected'
                          ? 'border-red-100 bg-red-50/10'
                          : 'border-slate-100 bg-white shadow-sm'
                      }`}
                    >
                      <div className="space-y-3 max-w-2xl font-sans">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif font-bold text-lg text-slate-900">{leave.teacherName}</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">ID: {leave.id}</span>
                          
                          {leave.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                          {leave.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                          {leave.status === 'pending' && (
                            <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-150 px-2.5 py-0.5 rounded-full animate-pulse">
                              Pending Principal Decision
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs font-medium text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#C59B27]" />
                            <span>Type: <strong className="text-slate-700">{leave.leaveType}</strong></span>
                          </div>
                          <div>
                            <span>Start: <strong className="text-slate-700 font-mono">{leave.startDate}</strong></span>
                          </div>
                          <div>
                            <span>End: <strong className="text-slate-700 font-mono">{leave.endDate}</strong></span>
                          </div>
                        </div>

                        <p className="text-slate-600 text-sm italic font-serif">"{leave.reason}"</p>
                      </div>

                      <div className="flex items-center gap-3 self-end lg:self-center">
                        {leave.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleProcessLeave(leave.id, 'rejected', leave)}
                              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-[#4E342E] border border-slate-200 hover:border-amber-200 transition-all font-sans"
                            >
                              Deny Request
                            </button>
                            <button
                              onClick={() => handleProcessLeave(leave.id, 'approved', leave)}
                              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white shadow-sm hover:shadow transition-all font-sans"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve & PDF
                            </button>
                          </>
                        ) : (
                          leave.status === 'approved' && (
                            <button
                              onClick={() => generateLeaveCertificatePDF(leave)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-emerald-200 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all font-sans"
                            >
                              <Download className="w-4 h-4" /> Dowload PDF
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {leaveRequests.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs font-sans">No academic leave applications submitted yet by Tharumapuram College faculty.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
