/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import PerformanceVisualization from './PerformanceVisualization.tsx';
import { 
  getAllStudents, 
  saveStudentRecord, 
  saveAttendanceRecords, 
  getAllAttendanceRecords,
  submitLeaveRequest,
  saveMarkReport,
  getMarkReportsByIndex,
  saveTermSchedule,
  getTermSchedulesByGrade
} from '../lib/schoolData.ts';
import { StudentRecord, AttendanceRecord, LeaveRequest, MarkReport, AttendanceStatus, TermSchedule } from '../types.ts';
import { 
  ClipboardCheck, 
  UserPlus, 
  Sparkles, 
  GraduationCap, 
  PlusCircle, 
  Save, 
  Calendar,
  Layers,
  FileCheck2,
  CheckCircle,
  FileText,
  Percent,
  Search,
  BookOpen
} from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'students' | 'marks' | 'leave'>('attendance');
  const [loading, setLoading] = useState(true);

  // Selector filters
  const [selectedGrade, setSelectedGrade] = useState('Grade 10-A');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Notifications
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Local Attendance Batch marking working state
  const [currentAttendanceList, setCurrentAttendanceList] = useState<Record<string, AttendanceStatus>>({});

  // Registration states for New Student
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    indexNumber: '',
    name: '',
    grade: 'Grade 10-A',
    parentName: '',
    parentContact: ''
  });

  // Active student report card marking state
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentRecord | null>(null);
  const [scoreReport, setScoreReport] = useState({
    term: '1st Term Evaluation 2026',
    remarks: 'Consistent effort shown. Excellent engagement!',
    subjects: {
      'Pure Mathematics': 75,
      'Science & Technology': 75,
      'English Language': 75,
      'Tamil Language': 75,
      'Sri Lankan History': 75
    } as Record<string, number>
  });

  // Marks and schedules state
  const [marksSubTabMode, setMarksSubTabMode] = useState<'individual' | 'bulk_upload' | 'schedules'>('individual');
  const [termSchedules, setTermSchedules] = useState<TermSchedule[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    title: '1st Term Examination Schedule',
    date: new Date().toISOString().split('T')[0],
    subject: 'Pure Mathematics',
    details: 'Exam Venue: Main Hall. Time: 08:30 AM to 11:30 AM.'
  });

  // Bulk uploading states
  const [bulkCsvText, setBulkCsvText] = useState(
    "IndexNumber,Term,Subject,Score,Remarks\n" +
    "INDEX-001,1st Term Evaluation 2026,Pure Mathematics,88,Excellent core mastery!\n" +
    "INDEX-002,1st Term Evaluation 2026,Pure Mathematics,74,Good efforts seen throughout Term."
  );
  const [parsedBulkRecords, setParsedBulkRecords] = useState<any[]>([]);

  // Leave Form states
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Personal Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Performance trends visual states
  const [studentReportsForChart, setStudentReportsForChart] = useState<MarkReport[]>([]);

  useEffect(() => {
    if (selectedStudentForReport) {
      getMarkReportsByIndex(selectedStudentForReport.indexNumber)
        .then(reps => setStudentReportsForChart(reps))
        .catch(err => console.error('Error fetching visual student reports:', err));
    } else {
      setStudentReportsForChart([]);
    }
  }, [selectedStudentForReport]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allStus, allAtts, schedules] = await Promise.all([
        getAllStudents(),
        getAllAttendanceRecords(),
        getTermSchedulesByGrade(selectedGrade)
      ]);
      setStudents(allStus);
      setAttendance(allAtts);
      setTermSchedules(schedules);

      // Pre-populate attendance roster list for selected filters
      const classStus = allStus.filter(s => s.grade === selectedGrade);
      const list: Record<string, AttendanceStatus> = {};
      classStus.forEach(s => {
        // Check if there is already a saved attendance record for this student/date
        const exactId = `${s.indexNumber}_${selectedDate}`;
        const match = allAtts.find(a => a.id === exactId);
        list[s.indexNumber] = match ? match.status : 'present';
      });
      setCurrentAttendanceList(list);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGrade, selectedDate]);

  const triggerToast = (textString: string, typeVal: 'success' | 'error' = 'success') => {
    setMessage({ text: textString, type: typeVal });
    setTimeout(() => setMessage(null), 4000);
  };

  const parseBulkCsv = () => {
    if (!bulkCsvText.trim()) {
      triggerToast('CSV text data is empty.', 'error');
      return;
    }
    const lines = bulkCsvText.split('\n');
    const records: any[] = [];
    
    let startIndex = 0;
    if (lines[0].toLowerCase().includes('index') || lines[0].toLowerCase().includes('term')) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(',');
      if (cols.length >= 4) {
        const indexNumber = cols[0].trim().toUpperCase();
        const term = cols[1]?.trim() || '1st Term Evaluation 2026';
        const subject = cols[2]?.trim() || 'Pure Mathematics';
        const score = parseFloat(cols[3]?.trim() || '0');
        const remarks = cols[4]?.trim() || 'Imported via bulk marks upload.';
        
        const matchingStu = students.find(s => s.indexNumber.toUpperCase().trim() === indexNumber);
        
        records.push({
          indexNumber,
          term,
          subject,
          score,
          remarks,
          studentName: matchingStu ? matchingStu.name : 'Unknown Student',
          valid: !!matchingStu
        });
      }
    }
    
    if (records.length === 0) {
      triggerToast('No valid rows found in input text.', 'error');
    } else {
      setParsedBulkRecords(records);
      triggerToast(`Succesfully parsed ${records.length} marksheet rows for validation!`);
    }
  };

  const commitBulkUpload = async () => {
    if (parsedBulkRecords.length === 0) {
      triggerToast('No parsed records to publish.', 'error');
      return;
    }
    let successCount = 0;
    try {
      for (const rec of parsedBulkRecords) {
        const newReportId = `mr_${rec.indexNumber}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
        const matchingStu = students.find(s => s.indexNumber.toUpperCase().trim() === rec.indexNumber);
        
        const reportObj: MarkReport = {
          id: newReportId,
          studentId: rec.indexNumber,
          studentName: matchingStu ? matchingStu.name : rec.studentName,
          grade: matchingStu ? matchingStu.grade : selectedGrade,
          term: rec.term,
          subjects: {
            [rec.subject]: rec.score
          },
          total: rec.score,
          remarks: rec.remarks,
          average: rec.score,
          updatedAt: new Date().toISOString()
        };
        await saveMarkReport(reportObj);
        successCount++;
      }
      triggerToast(`Successfully committed and saved ${successCount} term evaluation marks!`);
      setParsedBulkRecords([]);
      setBulkCsvText('');
    } catch (err) {
      console.error(err);
      triggerToast('An error occurred during bulk commit.', 'error');
    }
  };

  const handleCreateTermSchedule = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const scheduleId = `sched_${Date.now().toString(36)}`;
      const scheduleObj: TermSchedule = {
        id: scheduleId,
        grade: selectedGrade,
        title: newSchedule.title,
        date: newSchedule.date,
        subject: newSchedule.subject,
        details: newSchedule.details,
        publishedAt: new Date().toISOString()
      };
      
      await saveTermSchedule(scheduleObj);
      triggerToast(`New Exam Term Schedule Published for ${selectedGrade}!`);
      setNewSchedule({
        title: '1st Term Examination Schedule',
        date: new Date().toISOString().split('T')[0],
        subject: 'Pure Mathematics',
        details: 'Exam Venue: Main Hall. Time: 08:30 AM to 11:30 AM.'
      });
      loadData();
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save assessment schedule.', 'error');
    }
  };

  const handleStatusChange = (index: string, status: AttendanceStatus) => {
    setCurrentAttendanceList(prev => ({
      ...prev,
      [index]: status
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      const recordsToSave: AttendanceRecord[] = [];
      const classStus = students.filter(s => s.grade === selectedGrade);

      classStus.forEach(s => {
        const markStatus = currentAttendanceList[s.indexNumber] || 'present';
        recordsToSave.push({
          id: `${s.indexNumber}_${selectedDate}`,
          studentId: s.indexNumber,
          studentName: s.name,
          grade: s.grade,
          date: selectedDate,
          status: markStatus,
          markedBy: user?.name || 'Vetted Teacher',
          markedAt: new Date().toISOString()
        });
      });

      await saveAttendanceRecords(recordsToSave);
      triggerToast(`Successfully saved attendance logs for ${selectedGrade} on ${selectedDate}!`);
      loadData();
    } catch (e) {
      console.error(e);
      triggerToast('Error saving attendance records', 'error');
    }
  };

  const handleAddStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStudent.indexNumber || !newStudent.name) {
      triggerToast('Index Number and Name are mandatory', 'error');
      return;
    }

    try {
      const uIndex = newStudent.indexNumber.toUpperCase().trim();
      const payload = {
        ...newStudent,
        indexNumber: uIndex,
        createdAt: new Date().toISOString()
      };
      await saveStudentRecord(payload);
      triggerToast(`Student ${newStudent.name} registered successfully!`);
      setShowAddStudent(false);
      setNewStudent({
        indexNumber: '',
        name: '',
        grade: 'Grade 10-A',
        parentName: '',
        parentContact: ''
      });
      loadData();
    } catch (err) {
      triggerToast('Error registering student record.', 'error');
    }
  };

  const handleSubjectMarkChange = (subject: string, score: number) => {
    const safeScore = Math.max(0, Math.min(100, score));
    setScoreReport(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subject]: safeScore
      }
    }));
  };

  const calculateReportStatistics = () => {
    const scores = Object.values(scoreReport.subjects) as number[];
    const total = scores.reduce((a, b) => a + b, 0);
    const average = scores.length > 0 ? parseFloat((total / scores.length).toFixed(1)) : 0;
    return { total, average };
  };

  const handleSaveReportCard = async () => {
    if (!selectedStudentForReport) return;
    const { total, average } = calculateReportStatistics();

    const reportCard: MarkReport = {
      id: `${selectedStudentForReport.indexNumber}_${scoreReport.term.replace(/\s+/g, '_')}`,
      studentId: selectedStudentForReport.indexNumber,
      studentName: selectedStudentForReport.name,
      grade: selectedStudentForReport.grade,
      term: scoreReport.term,
      subjects: scoreReport.subjects,
      total,
      average,
      remarks: scoreReport.remarks,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveMarkReport(reportCard);
      triggerToast(`Exam marks scorecard published successfully for ${selectedStudentForReport.name}!`);
      setSelectedStudentForReport(null);
    } catch (e) {
      triggerToast('Error saving score report card.', 'error');
    }
  };

  const handleLeaveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      triggerToast('Please write a detailed explanation of leave request.', 'error');
      return;
    }

    try {
      const reqPayload: LeaveRequest = {
        id: 'LV-' + Math.floor(1000 + Math.random() * 9000),
        teacherId: user?.uid || 'unknown-teacher',
        teacherName: user?.name || 'Hon. Faculty Teacher',
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await submitLeaveRequest(reqPayload);
      triggerToast('Leave application submitted successfully. Pending Principal approval!');
      setLeaveForm({
        leaveType: 'Casual Personal Leave',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } catch (err) {
      triggerToast('Error submitting leave query.', 'error');
    }
  };

  return (
    <div id="teacher_dashboard_view" className="space-y-8 animate-fade-in">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-r from-[#4E342E] to-[#2B1B17] text-white rounded-3xl p-8 shadow-xl border border-amber-800/10">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Department Faculty
            </div>
            <h1 id="teacher_welcome_heading" className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white">
              {user?.name}
            </h1>
            <p className="text-amber-100/80 text-sm max-w-lg md:max-w-xl font-sans">
              Subject Specialist (<strong>{user?.subject || 'General Curricula'}</strong>). Access and maintain daily school attendance ledgers, register new student admissions, and update test marks.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#3E2723]/30 p-4 rounded-2xl border border-amber-500/20 backdrop-blur-md">
            <GraduationCap className="w-10 h-10 text-amber-300" />
            <div>
              <p className="text-xs text-amber-200/80 uppercase tracking-widest font-mono font-medium">Department</p>
              <p className="font-bold text-sm text-amber-50 leading-none mt-1">Science & Math Science</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Banner Toast */}
      {message && (
        <div 
          className={`flex items-center gap-3 p-4 rounded-xl border animate-slide-in font-sans ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle className={`w-5 h-5 flex-shrink-0 ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Sub-Tab Navigation Elements */}
      <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-6 text-sm">
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`pb-4 px-1 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'attendance'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Daily Attendance
        </button>
        <button
          onClick={() => setActiveSubTab('students')}
          className={`pb-4 px-1 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'students'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Student Registry
        </button>
        <button
          onClick={() => {
            setActiveSubTab('marks');
            setSelectedStudentForReport(null);
          }}
          className={`pb-4 px-1 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'marks'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileCheck2 className="w-4 h-4" /> Publish Scores
        </button>
        <button
          onClick={() => setActiveSubTab('leave')}
          className={`pb-4 px-1 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'leave'
              ? 'border-[#4E342E] text-[#4E342E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-4 h-4" /> Apply For Leave
        </button>
      </div>

      {/* Workspace Display Area */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#C59B27] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-slate-400">Loading department database...</p>
          </div>
        ) : (
          <>
            {/* SUBTAB 1: ATTENDANCE WORKSPACE */}
            {activeSubTab === 'attendance' && (
              <div id="subtab_attendance_register" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-slate-900">Mark Classroom Roster</h2>
                    <p className="text-xs text-slate-400">Choose classroom grade and calendar date. Mark records then hit save.</p>
                  </div>

                  {/* Filter Select Controls Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <select 
                        id="select_attendance_grade"
                        value={selectedGrade} 
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="bg-transparent focus:outline-none"
                      >
                        <option value="Grade 10-A">Grade 10-A</option>
                        <option value="Grade 11-B">Grade 11-B</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <input 
                        id="input_attendance_date"
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Students list for marking */}
                <div className="space-y-3 font-sans">
                  {students.filter(s => s.grade === selectedGrade).map((stu, idx) => {
                    const currentStatus = currentAttendanceList[stu.indexNumber] || 'present';
                    return (
                      <div 
                        key={stu.indexNumber} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 hover:border-slate-100/60 transition-all gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-full bg-slate-100 font-mono font-bold text-xs text-slate-500 flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm leading-tight">{stu.name}</h4>
                            <p className="text-slate-400 text-xs font-mono mt-0.5">{stu.indexNumber} • Parent: {stu.parentName}</p>
                          </div>
                        </div>

                        {/* Roster Marking Toggle Controls */}
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                          <button
                            onClick={() => handleStatusChange(stu.indexNumber, 'present')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'present' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleStatusChange(stu.indexNumber, 'late')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'late' 
                                ? 'bg-amber-500 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => handleStatusChange(stu.indexNumber, 'absent')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'absent' 
                                ? 'bg-rose-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {students.filter(s => s.grade === selectedGrade).length === 0 && (
                    <p className="py-12 text-center text-slate-400 text-xs italic">No students registered in {selectedGrade} yet.</p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    id="btn_save_attendance"
                    onClick={handleSaveAttendance}
                    className="inline-flex items-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:shadow-md transition-all font-sans"
                  >
                    <Save className="w-4 h-4" /> Save Roster Attendance
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 2: STUDENT ACCOUNTS REGISTRAR */}
            {activeSubTab === 'students' && (
              <div id="subtab_student_registrar" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-slate-900">Student Enrollment Registry</h2>
                    <p className="text-xs text-slate-400">View registered pupil rosters or enroll new students under proper indexing protocols.</p>
                  </div>
                  <button
                    id="btn_enroll_student_toggle"
                    onClick={() => setShowAddStudent(!showAddStudent)}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors font-sans"
                  >
                    <PlusCircle className="w-4 h-4" /> Register New Student
                  </button>
                </div>

                {/* Toggleable Adding Form Card */}
                {showAddStudent && (
                  <form onSubmit={handleAddStudentSubmit} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 font-sans max-w-2xl">
                    <h3 className="font-serif font-bold text-slate-800 text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> New Student Enrollment Form
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                      <div className="space-y-1">
                        <label htmlFor="stu_index">Unique Index Number *</label>
                        <input id="stu_index" type="text" placeholder="e.g. STU202611" value={newStudent.indexNumber} onChange={(e) => setNewStudent({...newStudent, indexNumber: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#C59B27] font-mono text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="stu_name">Student Full Name *</label>
                        <input id="stu_name" type="text" placeholder="e.g. S. Sivaruban" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#C59B27] text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="stu_grade">Enroll Class/Grade *</label>
                        <select id="stu_grade" value={newStudent.grade} onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#C59B27] text-sm">
                          <option value="Grade 10-A">Grade 10-A</option>
                          <option value="Grade 11-B">Grade 11-B</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="stu_parent">Parent/Guardian Name</label>
                        <input id="stu_parent" type="text" placeholder="e.g. Sureshkumar" value={newStudent.parentName} onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#C59B27] text-sm" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label htmlFor="stu_contact">Parent Contact Mobile Number</label>
                        <input id="stu_contact" type="tel" placeholder="e.g. +94 77 123 4567" value={newStudent.parentContact} onChange={(e) => setNewStudent({...newStudent, parentContact: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#C59B27] text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setShowAddStudent(false)} className="px-4 py-2 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-100">Cancel</button>
                      <button type="submit" className="bg-[#4E342E] hover:bg-[#3E2723] text-white px-4 py-2 rounded-xl text-xs font-bold">Admit Pupil</button>
                    </div>
                  </form>
                )}

                {/* Pupil Roster table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-sm">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 text-xs font-mono uppercase tracking-widest pb-3">
                        <th className="py-3 px-4">Index No</th>
                        <th className="py-3 px-4">Full Student Name</th>
                        <th className="py-3 px-4">Assigned Grade</th>
                        <th className="py-3 px-4">Parent/Guardian</th>
                        <th className="py-3 px-4">Emergency Contact</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((stu) => (
                        <tr key={stu.indexNumber} className="border-b border-slate-50 hover:bg-slate-50/50 font-medium text-slate-800">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-[#4E342E]">{stu.indexNumber}</td>
                          <td className="py-3 px-4">{stu.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/50">{stu.grade}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{stu.parentName || '—'}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{stu.parentContact || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentForReport(stu);
                                setActiveSubTab('marks');
                              }}
                              className="text-xs text-[#C59B27] hover:text-[#b58c27] font-bold hover:underline"
                            >
                              Add Marks score
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB 3: CURRICULAR MARK PUBLISHING */}
            {activeSubTab === 'marks' && (
              <div id="subtab_score_publisher" className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-slate-900">Exam score Reports Desk</h2>
                    <p className="text-xs text-slate-400">Select an enrolled student, enter evaluations scores and publish reports cards, or perform bulk uploads.</p>
                  </div>

                  {/* Mode Selector for Marks Sub-Tab */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl max-w-lg gap-2 text-xs font-bold text-slate-500 self-start">
                    <button
                      onClick={() => setMarksSubTabMode('individual')}
                      className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${marksSubTabMode === 'individual' ? 'bg-white shadow text-slate-900' : 'hover:text-slate-700'}`}
                    >
                      Individual Card
                    </button>
                    <button
                      onClick={() => setMarksSubTabMode('bulk_upload')}
                      className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${marksSubTabMode === 'bulk_upload' ? 'bg-white shadow text-slate-900' : 'hover:text-slate-700'}`}
                    >
                      Bulk CSV Upload
                    </button>
                    <button
                      onClick={() => setMarksSubTabMode('schedules')}
                      className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${marksSubTabMode === 'schedules' ? 'bg-white shadow text-slate-900' : 'hover:text-slate-700'}`}
                    >
                      Assessment Schedules
                    </button>
                  </div>
                </div>

                {marksSubTabMode === 'individual' && (
                  <>
                    {!selectedStudentForReport ? (
                      /* Student Search Selector List */
                      <div className="space-y-4">
                        <div className="relative max-w-md">
                          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Type student name or index number..." 
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase();
                              // Filter list below dynamically
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#C59B27] bg-white text-slate-700" 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {students.map(s => (
                            <div 
                              key={s.indexNumber}
                              onClick={() => setSelectedStudentForReport(s)}
                              className="border border-slate-100 p-4 rounded-2xl flex justify-between items-center bg-slate-50/30 hover:bg-amber-50/10 hover:border-amber-200/40 cursor-pointer transition-all duration-200"
                            >
                              <div className="font-sans">
                                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase leading-none">{s.indexNumber}</p>
                                <h4 className="font-bold text-slate-800 text-sm mt-1">{s.name}</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">{s.grade}</p>
                              </div>
                              <BookOpen className="w-5 h-5 text-slate-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Evaluation Marking Scoring Sheet Form */
                      <div className="space-y-6 max-w-3xl font-sans text-sm">
                        {/* Active Student Card Info */}
                        <div className="flex justify-between items-start bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Selected Candidate</span>
                            <h3 className="font-serif font-bold text-slate-900 text-lg mt-0.5">{selectedStudentForReport.name}</h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{selectedStudentForReport.indexNumber} • {selectedStudentForReport.grade}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedStudentForReport(null)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-white shadow-sm px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
                          >
                            Change Pupil
                          </button>
                        </div>

                        {/* Historical score progress trend visualization */}
                        {studentReportsForChart.length > 0 && (
                          <PerformanceVisualization reports={studentReportsForChart} />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Score Card Entries list */}
                          <div className="space-y-4">
                            <div className="space-y-1 text-xs font-semibold text-slate-500 flex flex-col">
                              <label htmlFor="exam_term">Evaluation Academic Term *</label>
                              <select 
                                id="exam_term"
                                value={scoreReport.term} 
                                onChange={(e) => setScoreReport({...scoreReport, term: e.target.value})}
                                className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 font-sans font-medium"
                              >
                                <option value="1st Term Evaluation 2026">1st Term Evaluation 2026</option>
                                <option value="2nd Term Evaluation 2026">2nd Term Evaluation 2026</option>
                                <option value="Final Term Evaluation 2026">Final Term Evaluation 2026</option>
                              </select>
                            </div>

                            {/* Subject Entry sliders */}
                            <div className="space-y-3 bg-slate-50/40 p-4 rounded-2xl border border-slate-100/60">
                              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Subject Evaluation Scores (0-100)</h4>
                              
                              {Object.keys(scoreReport.subjects).map((sub) => (
                                <div key={sub} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-50 pb-2">
                                  <span className="font-semibold text-xs text-slate-700">{sub}</span>
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <input 
                                      id={`slider_${sub.replace(/\s+/g, '_')}`}
                                      type="range" 
                                      min="0" 
                                      max="100" 
                                      value={scoreReport.subjects[sub]}
                                      onChange={(e) => handleSubjectMarkChange(sub, parseInt(e.target.value) || 0)}
                                      className="accent-[#4E342E] flex-1 sm:w-32"
                                    />
                                    <input 
                                      id={`input_mark_${sub.replace(/\s+/g, '_')}`}
                                      type="number" 
                                      min="0" 
                                      max="100" 
                                      value={scoreReport.subjects[sub]}
                                      onChange={(e) => handleSubjectMarkChange(sub, parseInt(e.target.value) || 0)}
                                      className="w-12 text-center p-1 rounded border border-slate-200 font-mono font-bold text-xs focus:outline-none bg-white text-slate-700"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right: Score card Totals and Remarks panel */}
                          <div className="space-y-4">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl space-y-4 shadow-md">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-[#FFEB3B] font-mono">Real-Time Evaluation Sum</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Grand Score Sum</span>
                                  <strong className="text-3xl font-mono block text-slate-100">{calculateReportStatistics().total}</strong>
                                  <span className="text-[9px] text-slate-500">out of 500 max</span>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30 flex flex-col justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Group Average</span>
                                    <strong className="text-3xl font-mono block text-[#FFEB3B]">{calculateReportStatistics().average}%</strong>
                                  </div>
                                  <div className="inline-flex items-center gap-1 mt-2 text-[9px] font-bold text-emerald-400">
                                    <Percent className="w-3.5 h-3.5" />
                                    <span>Normalized Rank</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs font-semibold text-slate-500 flex flex-col">
                              <label htmlFor="exam_remarks">Academic Council / Teacher Remarks</label>
                              <textarea 
                                id="exam_remarks"
                                rows={4}
                                value={scoreReport.remarks}
                                onChange={(e) => setScoreReport({...scoreReport, remarks: e.target.value})}
                                placeholder="Write comprehensive notes regarding student behavior, academic strengths, and areas requiring tutoring guidance..."
                                className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-[#C59B27] text-sm leading-relaxed text-slate-755"
                              />
                            </div>

                            <button
                              id="btn_publish_scorecard"
                              onClick={handleSaveReportCard}
                              className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white py-3 rounded-2xl font-bold hover:shadow-md transition-all duration-200 cursor-pointer"
                            >
                              <FileText className="w-4.5 h-4.5" /> Publish score evaluation card
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {marksSubTabMode === 'bulk_upload' && (
                  <div className="space-y-6 max-w-4xl font-sans">
                    <div>
                      <h3 className="text-md font-serif font-bold text-slate-900 animate-fade-in">Upload Bulk Academic Marks</h3>
                      <p className="text-xs text-slate-400">Copy-Paste CSV records or drag-and-drop file into browser pane. Required Headers: IndexNumber, Term, Subject, Score, Remarks</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <textarea
                          rows={8}
                          value={bulkCsvText}
                          onChange={(e) => setBulkCsvText(e.target.value)}
                          placeholder="IndexNumber,Term,Subject,Score,Remarks"
                          className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-[#C59B27] focus:border-[#C59B27] text-slate-700"
                        />

                        {/* File CSV Drop area */}
                        <div 
                          className="border-2 border-dashed border-slate-200 p-6 rounded-3xl text-center bg-slate-50 hover:bg-slate-150/50 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 animate-pulse"
                          onClick={() => {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = '.csv, .txt';
                            fileInput.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const r = new FileReader();
                                r.onload = (event) => {
                                  const text = event.target?.result as string;
                                  if (text) {
                                    setBulkCsvText(text);
                                    triggerToast("CSV file loaded successfully! Click Parse below to validate.");
                                  }
                                };
                                r.readAsText(file);
                              }
                            };
                            fileInput.click();
                          }}
                        >
                          <span className="text-slate-400 text-xs font-semibold">Drag and drop academic marksheets .csv here or <span className="text-[#C59B27] underline">browse local drive</span></span>
                        </div>

                        <button
                          onClick={parseBulkCsv}
                          className="w-full py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          Load & Parse Data Rows
                        </button>
                      </div>

                      {parsedBulkRecords.length > 0 ? (
                        <div className="space-y-4 border border-slate-150 rounded-2xl p-4 bg-white shadow-xs max-h-[350px] overflow-y-auto">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <strong className="text-xs text-slate-800">Preview Parsed Records ({parsedBulkRecords.length})</strong>
                            <button
                              onClick={commitBulkUpload}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-transform"
                            >
                              Publish to Portal
                            </button>
                          </div>
                          <div className="space-y-3">
                            {parsedBulkRecords.map((item, idx) => (
                              <div key={idx} className={`p-2.5 rounded-xl border text-xs flex justify-between items-center ${item.valid ? 'border-slate-100 bg-slate-50/50' : 'border-rose-100 bg-rose-50/20'}`}>
                                <div>
                                  <p className="font-bold text-slate-800">{item.studentName} ({item.indexNumber})</p>
                                  <p className="text-[10px] text-slate-405 text-slate-400">{item.subject} • Term: {item.term}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-mono font-bold text-slate-755 text-slate-700 bg-white border px-1.5 py-0.5 rounded-lg">{item.score}%</span>
                                  {!item.valid && <p className="text-[9px] text-rose-500 font-bold mt-1">Pupil Not Found</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 p-8 rounded-2xl bg-slate-50/30 text-center flex flex-col items-center justify-center text-slate-400 text-xs">
                          <p>Ready to validate CSV data rows.</p>
                          <p className="text-[10px] mt-1 text-slate-400/80">Format: IndexNumber, Term, Subject, Score, Remarks</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {marksSubTabMode === 'schedules' && (
                  <div className="space-y-6 max-w-4xl font-sans text-xs">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left side form */}
                      <form onSubmit={handleCreateTermSchedule} className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100/60 text-slate-600 font-semibold text-xs">
                        <h3 className="text-xs font-serif font-bold text-slate-900">Publish Assessment Schedules</h3>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="sched_title">Assessment Schedule Header *</label>
                          <input
                            id="sched_title"
                            type="text"
                            required
                            placeholder="e.g. 1st Term Examination Schedule"
                            value={newSchedule.title}
                            onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-slate-700 text-xs font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="sched_date">Target Exam Date *</label>
                            <input
                              id="sched_date"
                              type="date"
                              required
                              value={newSchedule.date}
                              onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 text-xs font-mono font-medium"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="sched_subject">Core Curriculum Subject</label>
                            <select
                              id="sched_subject"
                              value={newSchedule.subject}
                              onChange={(e) => setNewSchedule({ ...newSchedule, subject: e.target.value })}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 text-xs font-medium"
                            >
                              <option value="Pure Mathematics">Pure Mathematics</option>
                              <option value="Science & Technology">Science & Technology</option>
                              <option value="English Language">English Language</option>
                              <option value="Tamil Language">Tamil Language</option>
                              <option value="Sri Lankan History">Sri Lankan History</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="sched_details">Venue and Timing details</label>
                          <textarea
                            id="sched_details"
                            rows={3}
                            required
                            value={newSchedule.details}
                            onChange={(e) => setNewSchedule({ ...newSchedule, details: e.target.value })}
                            placeholder="Exam Venue, seating instructions..."
                            className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 text-xs font-medium font-sans leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          Save & Publish Schedule
                        </button>
                      </form>

                      {/* Right side display list of published schedules */}
                      <div className="space-y-4">
                        <h4 className="font-serif font-bold text-slate-950 text-sm">Published Announcements ({termSchedules.length})</h4>
                        {termSchedules.length === 0 ? (
                          <div className="border border-dashed border-slate-200 text-slate-400 p-8 rounded-2xl text-center text-xs">
                            No schedules published for {selectedGrade} yet.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[380px] overflow-y-auto">
                            {termSchedules.map((item) => (
                              <div key={item.id} className="border border-slate-100 p-4 rounded-2xl bg-white shadow-xs space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-bold text-slate-900 text-sm">{item.title}</h5>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded-md">{item.subject} • Grade {item.grade}</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-[#C59B27] bg-amber-50 px-2 py-1 rounded-lg">Exam: {item.date}</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-xs">{item.details}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: FACULTY LEAVE SUBMISSIONS */}
            {activeSubTab === 'leave' && (
              <div id="subtab_leave_desk" className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-serif font-bold text-slate-900">Department Leave Submissions</h2>
                  <p className="text-xs text-slate-400">File leave claims with the Principal office. Approved leaves trigger automatic institution registry and PDF certificate print validation.</p>
                </div>

                <form onSubmit={handleLeaveSubmit} className="space-y-4 max-w-xl font-sans text-xs font-semibold text-slate-500">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 flex flex-col sm:col-span-3">
                      <label htmlFor="leave_type">Leave Classification Category *</label>
                      <select id="leave_type" value={leaveForm.leaveType} onChange={(e) => setLeaveForm({...leaveForm, leaveType: e.target.value})} className="bg-white p-2.5 rounded-xl border border-slate-200 focus:outline-none text-slate-700 font-sans font-medium text-sm">
                        <option value="Casual Personal Leave">Casual Personal Leave</option>
                        <option value="Medical Sick Leave">Medical Sick Leave</option>
                        <option value="Duty Special Leave">Duty Special Leave</option>
                        <option value="Authorized Maternity Lease">Authorized Maternity Lease</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="leave_start">Commencing Date *</label>
                      <input id="leave_start" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-700" />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="leave_end">Concluding Date *</label>
                      <input id="leave_end" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-700" />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-center text-center">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Inferred span</span>
                        <strong className="text-base text-slate-800 tracking-tight font-mono">
                          {Math.max(1, Math.ceil(Math.abs(new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} Day(s)
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label htmlFor="leave_reason">Ground Cause Description *</label>
                    <textarea 
                      id="leave_reason"
                      rows={5} 
                      value={leaveForm.reason} 
                      onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                      placeholder="Please delineate detailed administrative support grounds. E.g., medical diagnoses certificates details, family ceremonies details, and confirm that class teaching syllabus sessions have been successfully delegated..." 
                      className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-medium font-sans text-sm leading-relaxed" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl shadow hover:shadow-md transition-all duration-200 text-sm font-sans"
                  >
                    Submit official leave application
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
