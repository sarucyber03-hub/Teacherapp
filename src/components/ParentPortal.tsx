/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { getMarkReportsByIndex, getStudentByIndex, getTermSchedulesByGrade } from '../lib/schoolData.ts';
import { StudentRecord, MarkReport, TermSchedule } from '../types.ts';
import PerformanceVisualization from './PerformanceVisualization.tsx';
import { 
  Search, 
  Sparkles, 
  FileCheck2, 
  Percent, 
  BookOpen, 
  User, 
  Calendar, 
  Award,
  AlertCircle,
  TrendingUp,
  Download,
  School,
  CalendarCheck
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function ParentPortal({ initialIndex }: { initialIndex?: string }) {
  const [indexInput, setIndexInput] = useState(initialIndex || '');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [reports, setReports] = useState<MarkReport[]>([]);
  const [schedules, setSchedules] = useState<TermSchedule[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialIndex) {
      const fetchInitial = async () => {
        const index = initialIndex.toUpperCase().trim();
        if (!index) return;
        setLoading(true);
        setErrorMsg(null);
        setSearched(false);
        try {
          const studentData = await getStudentByIndex(index);
          if (!studentData) {
            setErrorMsg(`Index Number "${index}" could not be located in our official archives. Please verify with College registry.`);
            setLoading(false);
            return;
          }
          const [scoreHistory, schedulesData] = await Promise.all([
            getMarkReportsByIndex(index),
            getTermSchedulesByGrade(studentData.grade)
          ]);
          setStudent(studentData);
          setReports(scoreHistory);
          setSchedules(schedulesData);
          setSearched(true);
        } catch (e) {
          console.error(e);
          setErrorMsg("A database communication failure occurred during retrieval.");
        } finally {
          setLoading(false);
        }
      };
      fetchInitial();
    }
  }, [initialIndex]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const index = indexInput.toUpperCase().trim();
    if (!index) return;

    setLoading(true);
    setSearched(false);
    setErrorMsg(null);
    setStudent(null);
    setReports([]);
    setSchedules([]);

    try {
      const studentData = await getStudentByIndex(index);
      if (!studentData) {
        setErrorMsg(`Index Number "${index}" could not be located in our official archives. Please verify with College registry.`);
        setLoading(false);
        return;
      }

      const [scoreHistory, schedulesData] = await Promise.all([
        getMarkReportsByIndex(index),
        getTermSchedulesByGrade(studentData.grade)
      ]);

      setStudent(studentData);
      setReports(scoreHistory);
      setSchedules(schedulesData);
      setSearched(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("A database communication failure occurred during retrieval.");
    } finally {
      setLoading(false);
    }
  };

  // Standard Sri Lankan school grading mapping
  const getSubjectGrade = (mark: number) => {
    if (mark >= 75) return { code: 'A', text: 'Distinction', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (mark >= 65) return { code: 'B', text: 'Very Good', color: 'text-teal-600 bg-teal-50 border-teal-200' };
    if (mark >= 50) return { code: 'C', text: 'Credit Pass', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (mark >= 35) return { code: 'S', text: 'Simple Pass', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { code: 'W', text: 'Weak Attempt', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  };

  // Download Report Card as beautiful local PDF
  const downloadReportPDF = (report: MarkReport) => {
    if (!student) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer Borders
    doc.setDrawColor(78, 52, 46); // Brown line
    doc.setLineWidth(1.5);
    doc.rect(8, 8, 194, 281);
    doc.setDrawColor(218, 165, 32); // Gold line
    doc.setLineWidth(0.5);
    doc.rect(11, 11, 188, 275);

    // Official Ribbon Header
    doc.setFillColor(78, 52, 46);
    doc.rect(12, 12, 186, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Kn/THARUMAPURAM CENTRAL COLLEGE', 105, 21, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text('Primary & Secondary Educational Directorate | Kilinochchi Archive', 105, 28, { align: 'center' });
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('"Education to Live Exceptionally" - Official Term Evaluation report', 105, 33, { align: 'center' });

    // Document Title
    doc.setTextColor(78, 52, 46);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ACADEMIC PROGRESS SCORE CARD', 105, 54, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text(report.term, 105, 60, { align: 'center' });

    doc.setFillColor(218, 165, 32);
    doc.rect(75, 63, 60, 0.8, 'F');

    // Candidate details Table Box
    doc.setFillColor(248, 249, 250);
    doc.rect(15, 72, 180, 24, 'F');
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.5);
    doc.rect(15, 72, 180, 24);

    doc.setTextColor(51, 51, 51);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Student Index Brand:', 20, 79);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.indexNumber, 60, 79);

    doc.setFont('Helvetica', 'bold');
    doc.text('Student Full Name:', 20, 89);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.name, 60, 89);

    doc.setFont('Helvetica', 'bold');
    doc.text('Assigned Grade Class:', 115, 79);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.grade, 155, 79);

    doc.setFont('Helvetica', 'bold');
    doc.text('Parent/Guardian:', 115, 89);
    doc.setFont('Helvetica', 'normal');
    doc.text(student.parentName, 155, 89);

    // Subject evaluations headers
    let startY = 110;
    doc.setFillColor(78, 52, 46);
    doc.rect(15, startY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUBJECT DESCRIPTION', 20, startY + 5.5);
    doc.text('OBTAINED SCORE', 105, startY + 5.5);
    doc.text('SRI LANKA SYSTEM GRADE', 150, startY + 5.5);

    // Marks rows
    doc.setTextColor(33, 37, 41);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setDrawColor(230, 230, 230);

    let rowY = startY + 8;
    Object.entries(report.subjects).forEach(([sub, score]) => {
      doc.line(15, rowY, 195, rowY);
      doc.setFont('Helvetica', 'bold');
      doc.text(sub, 20, rowY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${score} %`, 105, rowY + 6);
      
      const grade = getSubjectGrade(score);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${grade.code}  (${grade.text})`, 150, rowY + 6);
      doc.setFont('Helvetica', 'normal');
      rowY += 10;
    });
    doc.line(15, rowY, 195, rowY);

    // Aggregates Block
    rowY += 8;
    doc.setFillColor(248, 249, 250);
    doc.rect(15, rowY, 180, 20, 'F');
    doc.rect(15, rowY, 180, 20);

    doc.setFont('Helvetica', 'bold');
    doc.text('AGGREGATE GRAND SUM TOTAL:', 20, rowY + 12);
    doc.text(`${report.total} / 500`, 90, rowY + 12);

    doc.text('NORMALIZED EVALUATION AV:', 125, rowY + 12);
    doc.setTextColor(78, 52, 46);
    doc.text(`${report.average} %`, 183, rowY + 12);

    // Remarks
    rowY += 28;
    doc.setTextColor(51, 51, 51);
    doc.setFont('Helvetica', 'bold');
    doc.text('Academic Council Remarks & Observations:', 15, rowY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    const splitRemarks = doc.splitTextToSize(report.remarks, 175);
    doc.text(splitRemarks, 15, rowY + 6);

    // Institutional Seal Sign-offs
    rowY += 34;
    doc.setDrawColor(200, 200, 200);
    doc.line(135, rowY, 195, rowY);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Principal's Vetting Seal", 165, rowY + 5, { align: 'center' });

    // Signature mockup logo
    doc.setFont('Courier', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(78, 52, 46);
    doc.text('P.Thavanesan', 165, rowY - 5, { align: 'center' });

    doc.save(`Academic_Report_${student.name.replace(/\s+/g, '_')}_TCC.pdf`);
  };

  return (
    <div id="parent_portal_view" className="space-y-8 animate-fade-in">
      {/* Branding Header Area */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
          <School className="w-3.5 h-3.5 text-amber-600" />
          Guardianship Registry
        </div>
        <h1 id="parent_portal_heading" className="text-3xl md:text-4xl font-serif font-bold text-slate-900 leading-tight">
          Secure Guardians Archive
        </h1>
        <p className="text-slate-500 text-sm font-sans">
          To protect student privacy, academic score cards are secured via institutional index keys. Kindly verify and enter your child's official student index number below.
        </p>
      </div>

      {/* Lookup Form element */}
      <div className="bg-white border border-slate-100 shadow-xl max-w-lg mx-auto rounded-3xl p-6 sm:p-8 font-sans">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-1.5 flex flex-col text-xs font-semibold text-slate-500">
            <label htmlFor="p_index_search">Student Index Number *</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                id="p_index_search"
                type="text"
                placeholder="e.g. STU202601"
                value={indexInput}
                onChange={(e) => setIndexInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:border-[#C59B27] text-sm font-mono font-bold tracking-widest text-[#4E342E]"
              />
            </div>
            <span className="text-[10px] text-slate-400 leading-normal">Enter the 9-character code registered with your class teacher tutor.</span>
          </div>

          <button
            id="btn_retrieve_records"
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#4E342E] hover:bg-[#3E2723] text-white font-bold py-3.5 rounded-2xl text-sm shadow hover:shadow-md transition-all duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Searching archives...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4.5 h-4.5" />
                <span>Retrieve Secure Score Card</span>
              </>
            )}
          </button>
        </form>

        {/* Localized Search Errors warnings */}
        {errorMsg && (
          <div className="mt-5 flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Render Searched Student academic results details */}
      {searched && student && (
        <div id="parent_reports_card_view" className="space-y-8 animate-slide-up max-w-4xl mx-auto">
          {/* Candidate Profile summary box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg border border-slate-800">
            <div className="space-y-2 font-sans">
              <div className="inline-flex px-3 py-1 rounded-full bg-[#C59B27]/20 border border-[#C59B27]/30 text-amber-200 text-[10px] font-mono uppercase tracking-widest font-bold">
                Student Record Confirmed
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-100">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <p>Index Number: <strong className="text-slate-200 font-mono">{student.indexNumber}</strong></p>
                <span>•</span>
                <p>Grade/Class: <strong className="text-slate-200">{student.grade}</strong></p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-sans border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 space-y-1">
              <p>Registered Parent: <strong className="text-slate-200">{student.parentName}</strong></p>
              <p>Primary Alert Contact: <span className="text-slate-200 font-mono">{student.parentContact}</span></p>
            </div>
          </div>

          {/* Student Term Performance Chart Visualization */}
          {reports.length > 0 && (
            <PerformanceVisualization reports={reports} />
          )}

          {/* Published Term Schedules section */}
          {schedules.length > 0 && (
            <div className="bg-amber-50/20 border border-amber-200/40 p-6 rounded-3xl space-y-4 animate-slide-up">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#C59B27]" />
                <h3 className="font-serif font-bold text-slate-900 text-sm uppercase tracking-wider">College Published Assessment & Examination Schedules</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((sched) => (
                  <div key={sched.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-sans font-bold text-slate-800 text-sm leading-tight">{sched.title}</h4>
                        <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono mt-1">{sched.subject}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#C59B27] bg-amber-50 px-2 py-1 rounded-lg">Exam: {sched.date}</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-normal font-sans">{sched.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Terms report cards history iterations */}
          {reports.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-slate-800 text-lg">No scorecards published yet</h3>
              <p className="text-slate-400 text-xs font-sans max-w-sm mx-auto mt-1">
                The student profiles is active, but teacher evaluators haven't uploaded marks for this academic term yet. Reach out to the classroom tutor.
              </p>
            </div>
          ) : (
            <div className="space-y-8 font-sans text-sm">
              {reports.map((report) => (
                <div key={report.id} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
                  {/* Card head bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-[#C59B27]" />
                      <div>
                        <h3 className="font-serif font-bold text-slate-800 text-lg">{report.term}</h3>
                        <p className="text-slate-400 text-xs">Evaluations scores and system marks registry certified by Principle.</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => downloadReportPDF(report)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white font-bold text-xs shadow hover:shadow-md transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Certified PDF
                    </button>
                  </div>

                  {/* Main scoring table rows with gauges */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Scores layout */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider px-4">
                        <span>Subject Title</span>
                        <span className="text-center">Score</span>
                        <span className="text-right">Grade</span>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(report.subjects).map(([sub, score]) => {
                          const scoreNum = score as number;
                          const grade = getSubjectGrade(scoreNum);
                          return (
                            <div key={sub} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-50 hover:bg-slate-50/20 grid grid-cols-3">
                              <span className="font-semibold text-slate-700">{sub}</span>
                              <div className="flex justify-center items-center">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{scoreNum}%</span>
                              </div>
                              <div className="flex justify-end">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ring-1 border ${grade.color}`}>
                                  Grade {grade.code} • {grade.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Aggregate summary donut design */}
                    <div className="bg-slate-50 border border-slate-100/50 p-6 rounded-3xl flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Term Aggregate Results</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] uppercase font-mono text-slate-400">Total Sum</span>
                            <strong className="text-2xl font-mono block text-slate-800 mt-1">{report.total}</strong>
                            <span className="text-[9px] text-slate-500">out of 500 max</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono text-slate-400">Group Average</span>
                              <strong className="text-2xl font-mono block text-[#C59B27] mt-1">{report.average}%</strong>
                            </div>
                            <div className="inline-flex items-center gap-1 mt-2 text-[9px] text-emerald-600 font-bold">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Normalized</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] uppercase font-mono text-slate-400">Tutor remarks & counseling:</span>
                          <p className="text-xs text-slate-600 mt-1 leading-normal italic font-serif bg-white p-3.5 rounded-2xl border border-slate-100">
                            "{report.remarks}"
                          </p>
                        </div>
                      </div>

                      {/* Official institutional grading summary guidelines */}
                      <div className="text-[9px] text-slate-400 font-mono border-t border-slate-200/50 pt-4 flex flex-wrap gap-x-2 gap-y-1">
                        <span><strong>Distinction:</strong> &ge;75% (A)</span>
                        <span>•</span>
                        <span><strong>Very Good:</strong> &ge;65% (B)</span>
                        <span>•</span>
                        <span><strong>Credit:</strong> &ge;50% (C)</span>
                        <span>•</span>
                        <span><strong>Pass:</strong> &ge;35% (S)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
