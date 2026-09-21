'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, StudentTranscript } from '@/lib/types';
import { 
  Search,
  Download,
  Printer, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  GraduationCap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface TranscriptTabProps {
  students: Student[];
  preselectedStudentId?: string;
}

export function TranscriptTab({ students, preselectedStudentId }: TranscriptTabProps) {
  const { t, language } = useLanguage();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || (students[0]?.id || '')
  );
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // PDF Export state
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter students based on name, ID, major, or college
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => 
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.major.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Current selected student index
  const currentIndex = useMemo(() => {
    return students.findIndex(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Fetch transcript data whenever selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) return;

    let isMounted = true;
    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/transcript/${selectedStudentId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          setTranscript(data.transcript);
        } else {
          setErrorMessage(data.error || (language === 'zh' ? '获取成绩单失败' : 'Failed to load transcript.'));
        }
      } catch {
        if (isMounted) setErrorMessage(language === 'zh' ? '网络错误，无法加载学生成绩单' : 'Network error while loading transcript.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId, language]);

  // Handle previous and next student
  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  // Generate real PDF and trigger browser file download
  const handleDownloadPdf = async () => {
    if (!transcript || isDownloadingPdf) return;
    const element = document.getElementById('transcript-document');
    if (!element) return;

    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = language === 'zh'
        ? `成绩单_${transcript.student.id}_${transcript.student.name}.pdf`
        : `Transcript_${transcript.student.id}_${transcript.student.name}.pdf`;

      // Trigger browser download to user's download folder via Blob URL
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 30000);

      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setErrorMessage(language === 'zh' ? '生成成绩单 PDF 失败，请重试' : 'Failed to generate transcript PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    // In iframe or sandboxed environments, window.print is often disabled or ignored.
    // Trigger the real PDF download directly to guarantee the file is saved to their download folder.
    handleDownloadPdf();
  };

  return (
    <div className="space-y-6">
      {/* Search & Navigation Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search by Student Name or Student ID */}
          <div className="flex-1 relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.selectTranscriptStudent}:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-transcript-student"
                type="text"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder={t.searchStudentPrompt}
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Results Popover */}
            {isDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2 text-[11px] font-semibold text-slate-400 bg-slate-50 flex justify-between items-center">
                  <span>{language === 'zh' ? `匹配结果 (${filteredStudents.length})` : `Matches (${filteredStudents.length})`}</span>
                  <span className="text-[10px] text-slate-400">{language === 'zh' ? '点击选择学生' : 'Click to select'}</span>
                </div>
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {language === 'zh' ? '未找到匹配的学生' : 'No students found matching query'}
                  </div>
                ) : (
                  filteredStudents.slice(0, 30).map((s) => {
                    const isSelected = s.id === selectedStudentId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchQuery(`${s.name} (${s.id})`);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between text-xs ${
                          isSelected ? 'bg-indigo-50 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs font-mono">
                            {s.name.slice(0, 1)}
                          </span>
                          <div>
                            <div className="text-slate-900 font-semibold">
                              {s.name}{' '}
                              <span className="font-mono text-indigo-600 font-medium">({s.id})</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {s.major} · {s.college}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Stepper & Direct Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                onClick={handlePrevStudent}
                disabled={currentIndex <= 0}
                title={language === 'zh' ? '上一位学生' : 'Previous Student'}
                className="p-1.5 rounded hover:bg-white text-slate-600 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-600">
                {currentIndex + 1} / {students.length}
              </span>
              <button
                onClick={handleNextStudent}
                disabled={currentIndex >= students.length - 1}
                title={language === 'zh' ? '下一位学生' : 'Next Student'}
                className="p-1.5 rounded hover:bg-white text-slate-600 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Select Fallback */}
            <select
              id="select-transcript-student"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const st = students.find(s => s.id === e.target.value);
                if (st) setSearchQuery(`${st.name} (${st.id})`);
              }}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-700 max-w-[200px] truncate"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </option>
              ))}
            </select>

            {/* Real PDF Download Action Button */}
            <button
              id="btn-download-pdf-transcript"
              onClick={handleDownloadPdf}
              disabled={!transcript || isDownloadingPdf}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.downloadingPdf}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t.downloadPdf}</span>
                </>
              )}
            </button>

            {/* Print Action Button */}
            <button
              id="btn-print-transcript"
              onClick={handlePrint}
              disabled={!transcript}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printTranscript}</span>
            </button>
          </div>
        </div>

        {/* Selected Student Information Summary */}
        {currentStudent && (
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span>{language === 'zh' ? '当前查看学生：' : 'Selected Student: '}</span>
            <strong className="text-slate-900 font-semibold">{currentStudent.name}</strong>
            <span className="font-mono text-indigo-700 font-semibold">({currentStudent.id})</span>
            <span className="text-slate-300">|</span>
            <span>{currentStudent.gender === 'M' ? (language === 'zh' ? '男' : 'Male') : (language === 'zh' ? '女' : 'Female')}</span>
            <span className="text-slate-300">|</span>
            <span>{currentStudent.major}</span>
            <span className="text-slate-300">|</span>
            <span>{currentStudent.college}</span>
          </div>
        )}
      </div>

      {/* Download Success Toast Notification */}
      {downloadSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs transition">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{t.downloadPdfSuccess}</span>
          </div>
          <button onClick={() => setDownloadSuccessToast(false)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Transcript Document View (Real printable & exportable DOM) */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '正在生成成绩单...' : 'Generating transcript...'}
        </div>
      ) : !transcript ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '请选择一名学生以查看官方成绩单。' : 'Select a student to view transcript.'}
        </div>
      ) : (
        <div 
          id="transcript-document"
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md print:border-none print:shadow-none space-y-8"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-widest mb-1">
                  <GraduationCap className="w-4 h-4" />
                  <span>{language === 'zh' ? '教务处学生综合成绩档案' : 'Academic Registrar & Grade Records'}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.officialTranscriptTitle}</h1>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'zh' 
                    ? '教务管理系统官方学籍与学业档案' 
                    : 'Official Academic Student Record'}
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 text-xs text-slate-600">
                <div>{language === 'zh' ? '认证状态：' : 'Document Status: '}
                  <strong className="text-emerald-700 font-semibold">{language === 'zh' ? '已核验有效' : 'VERIFIED'}</strong>
                </div>
                <div>{language === 'zh' ? '打印日期：' : 'Issue Date: '}
                  <span className="font-mono" suppressHydrationWarning>{new Date().toISOString().slice(0, 10)}</span>
                </div>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.studentName}</span>
                <span className="text-slate-900 font-bold text-sm">{transcript.student.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.studentId}</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">{transcript.student.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.major}</span>
                <span className="text-slate-800 font-medium">{transcript.student.major}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.college}</span>
                <span className="text-slate-800 font-medium">{transcript.student.college}</span>
              </div>
            </div>
          </div>

          {/* Academic Summary Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {t.academicSummaryMetrics}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Overall Average */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] font-semibold text-indigo-950 block">{t.overallAverage}</span>
                <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                  {transcript.overallAverage !== null ? transcript.overallAverage.toFixed(2) : 'N/A'}
                </div>
              </div>

              {/* Weighted Average */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-950 block">{t.weightedAverage}</span>
                <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {transcript.weightedAverage !== null ? transcript.weightedAverage.toFixed(2) : 'N/A'}
                </div>
              </div>

              {/* Earned Credits */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-700 block">{t.earnedCredits}</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {transcript.earnedCredits.toFixed(1)}
                </div>
              </div>

              {/* Graded Courses Count */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-700 block">{t.gradedCount}</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {transcript.gradedCoursesCount} / {transcript.totalCoursesCount}
                </div>
              </div>

              {/* Highest Score */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">{t.highestScore}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {transcript.highestScore !== null ? transcript.highestScore.toFixed(2) : 'N/A'}
                </div>
              </div>

              {/* Lowest Score */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">{t.lowestScore}</span>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {transcript.lowestScore !== null ? transcript.lowestScore.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Courses Details Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.courseDetailsRecords} ({transcript.courses.length})
              </h3>
              <span className="text-xs text-slate-500">
                {language === 'zh' ? '及格线：60.00 分' : 'Passing Threshold: 60.00'}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider">
                    <th className="py-3 px-4">{t.courseId}</th>
                    <th className="py-3 px-4">{t.courseName}</th>
                    <th className="py-3 px-4">{t.courseCategory}</th>
                    <th className="py-3 px-4 text-center">{t.credits}</th>
                    <th className="py-3 px-4 text-right">{t.score}</th>
                    <th className="py-3 px-4 text-right">{t.recordDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transcript.courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        {language === 'zh' ? '该学生尚未选修任何课程。' : 'No courses enrolled yet.'}
                      </td>
                    </tr>
                  ) : (
                    transcript.courses.map((item) => {
                      const isPassing = item.numericScore !== null && item.numericScore >= 60;
                      return (
                        <tr key={item.courseId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-700 whitespace-nowrap">
                            {item.courseId}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                            {item.courseName}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {item.credits.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            {item.numericScore !== null ? (
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                isPassing ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}>
                                {item.numericScore.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">{t.pendingGrade}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                            {item.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
